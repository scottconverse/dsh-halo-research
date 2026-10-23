import sys, unittest, json, math
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,sys.argv[1])
from queue_store import Queue, ConflictError

class Checks(unittest.TestCase):
    def setUp(self):
        self.now=10.0
        self.q=Queue(lambda:self.now)
    def add(self,tenant='a',key='k',**kw):
        return self.q.enqueue(tenant,key,{'nested':{'x':[1]}},**kw)
    def lease(self,tenant='a',owner='w',**kw):
        return self.q.claim(tenant,owner,**kw)[0]
    def test_01_tenant_idempotency(self):
        a=self.add(); b=self.add('b'); self.assertNotEqual(a['id'],b['id'])
    def test_02_conflicting_replay(self):
        a=self.add()
        with self.assertRaises(ConflictError): self.q.enqueue('a','k',{'nested':{'x':[2]}})
        self.assertEqual(self.q.peek('a',a['id'])['payload'],a['payload'])
    def test_03_schedule_conflict(self):
        self.add()
        with self.assertRaises(ConflictError): self.add(not_before=1)
    def test_04_input_snapshot(self):
        p={'a':[1]}; j=self.q.enqueue('a','k',p); p['a'].append(2)
        self.assertEqual(self.q.peek('a',j['id'])['payload'],{'a':[1]})
    def test_05_output_snapshots(self):
        j=self.add(); j['payload']['nested']['x'].append(2)
        a=self.q.peek('a',j['id']); a['payload']['nested']['x'].append(3)
        b=self.lease(); b['payload']['nested']['x'].append(4)
        self.assertEqual(self.q.peek('a',j['id'])['payload'],{'nested':{'x':[1]}})
    def test_06_claim_tenant(self):
        self.add('b'); self.assertEqual(self.q.claim('a','w'),[])
    def test_07_peek_tenant(self):
        j=self.add(); self.assertIsNone(self.q.peek('b',j['id']))
    def test_08_exact_ready_boundary(self):
        j=self.add(not_before=10); self.assertEqual(self.lease()['id'],j['id'])
    def test_09_limit(self):
        for i in range(4): self.add(key=str(i))
        self.assertEqual(len(self.q.claim('a','w',limit=2)),2)
    def test_10_expiration_boundary(self):
        j=self.add(expires_at=10); self.assertEqual(self.q.claim('a','w'),[])
        self.assertEqual(self.q.peek('a',j['id'])['status'],'expired')
    def test_11_foreign_expiration_untouched(self):
        j=self.add('b',expires_at=10); self.q.claim('a','w')
        self.assertEqual(self.q.peek('b',j['id'])['status'],'pending')
    def test_12_fifo_ties(self):
        ids=[self.add(key=str(i))['id'] for i in range(12)]
        self.assertEqual([j['id'] for j in self.q.claim('a','w',limit=12)],ids)
    def test_13_order_before_fifo(self):
        a=self.add(key='late',not_before=5); b=self.add(key='early',not_before=2)
        self.assertEqual([j['id'] for j in self.q.claim('a','w',limit=2)],[b['id'],a['id']])
    def test_14_ack_tenant(self):
        j=self.add(); a=self.lease(); self.assertFalse(self.q.ack('b',j['id'],a['token']))
        self.assertEqual(self.q.peek('a',j['id'])['status'],'leased')
    def test_15_ack_lease_boundary(self):
        j=self.add(); a=self.lease(lease_seconds=2); self.now=12
        self.assertFalse(self.q.ack('a',j['id'],a['token']))
    def test_16_ack_once(self):
        j=self.add(); a=self.lease(); self.assertTrue(self.q.ack('a',j['id'],a['token']))
        self.assertFalse(self.q.ack('a',j['id'],a['token']))
    def test_17_same_owner_fencing(self):
        j=self.add(); a=self.lease(lease_seconds=2); self.now=12; b=self.lease(lease_seconds=2)
        self.assertNotEqual(a['token'],b['token']); self.assertFalse(self.q.ack('a',j['id'],a['token']))
        self.assertTrue(self.q.ack('a',j['id'],b['token']))
    def test_18_deadline_during_lease(self):
        j=self.add(expires_at=12); a=self.lease(lease_seconds=10); self.now=12
        self.assertFalse(self.q.ack('a',j['id'],a['token']))
        self.assertFalse(self.q.nack('a',j['id'],a['token']))
    def test_19_nack_fencing_and_boundary(self):
        j=self.add(); a=self.lease(); self.assertTrue(self.q.nack('a',j['id'],a['token'],delay=3))
        self.assertFalse(self.q.ack('a',j['id'],a['token'])); self.assertFalse(self.q.nack('a',j['id'],a['token']))
        self.assertEqual(self.q.claim('a','w'),[]); self.now=13; b=self.lease()
        self.assertNotEqual(a['token'],b['token'])
    def test_20_original_idempotency_after_retry(self):
        j=self.add(); a=self.lease(); self.q.nack('a',j['id'],a['token'],delay=5)
        replay=self.add(); self.assertEqual(j['id'],replay['id']); self.assertEqual(replay['not_before'],15)
        with self.assertRaises(ConflictError): self.add(not_before=15)
    def test_21_invalid_claim_atomic(self):
        for kw in [dict(limit=0),dict(limit=-1),dict(limit=True),dict(limit=1.5),dict(lease_seconds=0),dict(lease_seconds=float('inf')),dict(lease_seconds=float('nan')),dict(lease_seconds=True),dict(owner='')]:
            with self.subTest(kw=kw):
                self.q=Queue(lambda:10); j=self.add(); before=self.q.peek('a',j['id'])
                with self.assertRaises(ValueError): self.q.claim('a',kw.get('owner','w'),**{k:v for k,v in kw.items() if k!='owner'})
                self.assertEqual(self.q.peek('a',j['id']),before)
    def test_22_invalid_schedule_atomic(self):
        for kw in [dict(not_before=float('nan')),dict(not_before=float('inf')),dict(not_before=True),dict(expires_at=False),dict(expires_at=0),dict(not_before=5,expires_at=4)]:
            with self.subTest(kw=kw):
                self.q=Queue(lambda:10)
                with self.assertRaises(ValueError): self.add(**kw)
                self.assertEqual(len(self.q.claim('a','w',limit=100)),0)
    def test_23_invalid_delay_even_missing(self):
        for d in [-1,True,float('nan'),float('inf')]:
            with self.subTest(delay=d):
                with self.assertRaises(ValueError): self.q.nack('a','missing','x',delay=d)
    def test_24_invalid_identifiers(self):
        for t,k in [('', 'k'),('a',''),(None,'k'),('a',5)]:
            with self.subTest(t=t,k=k):
                with self.assertRaises(ValueError): self.add(t,k)
    def test_25_terminal_idempotency(self):
        j=self.add(); a=self.lease(); self.q.ack('a',j['id'],a['token']); r=self.add()
        self.assertEqual(r['id'],j['id']); self.assertEqual(r['status'],'done')
    def test_26_concurrent_idempotency(self):
        with ThreadPoolExecutor(max_workers=12) as ex: ids=list(ex.map(lambda _:self.add()['id'],range(80)))
        self.assertEqual(len(set(ids)),1)
    def test_27_concurrent_claim_no_duplicates(self):
        for i in range(80): self.add(key=str(i))
        with ThreadPoolExecutor(max_workers=12) as ex: batches=list(ex.map(lambda i:self.q.claim('a',str(i),limit=1),range(100)))
        ids=[j['id'] for batch in batches for j in batch]
        self.assertEqual(len(ids),80); self.assertEqual(len(set(ids)),80)
    def test_28_nack_foreign_tenant(self):
        j=self.add(); a=self.lease(); self.assertFalse(self.q.nack('b',j['id'],a['token']))
        self.assertEqual(self.q.peek('a',j['id'])['status'],'leased')
    def test_29_bad_token_no_mutation(self):
        j=self.add(); a=self.lease(); before=self.q.peek('a',j['id'])
        self.assertFalse(self.q.ack('a',j['id'],'wrong')); self.assertFalse(self.q.nack('a',j['id'],'wrong'))
        self.assertEqual(before,self.q.peek('a',j['id']))
    def test_30_expired_reclaim_terminal(self):
        j=self.add(expires_at=12); a=self.lease(lease_seconds=1); self.now=12
        self.assertEqual(self.q.claim('a','w'),[]); self.assertEqual(self.q.peek('a',j['id'])['status'],'expired')

class Capture(unittest.TextTestResult):
    def __init__(self,*a,**kw): super().__init__(*a,**kw); self.passed=[]
    def addSuccess(self,t): super().addSuccess(t); self.passed.append(t.id())
result=unittest.TextTestRunner(verbosity=2,resultclass=Capture).run(unittest.defaultTestLoader.loadTestsFromTestCase(Checks))
report={'tests':result.testsRun,'passed':len(result.passed),'failures':len(result.failures),'errors':len(result.errors),'passedNames':result.passed,'failedNames':[t.id() for t,_ in result.failures],'errorNames':[t.id() for t,_ in result.errors]}
if len(sys.argv)>2:
    with open(sys.argv[2],'w') as f: json.dump(report,f,indent=2)
sys.exit(0 if result.wasSuccessful() else 1)
