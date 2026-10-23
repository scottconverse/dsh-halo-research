import threading
import unittest

from queue_store import ConflictError, Queue


class IdentifierValidationTests(unittest.TestCase):
    def setUp(self):
        self.q = Queue(lambda: 0)

    def test_invalid_tenant_key_and_owner_rejected(self):
        with self.assertRaises(ValueError):
            self.q.enqueue('', 'k', {})
        with self.assertRaises(ValueError):
            self.q.enqueue(None, 'k', {})
        with self.assertRaises(ValueError):
            self.q.enqueue('t', '', {})
        with self.assertRaises(ValueError):
            self.q.enqueue('t', 5, {})
        with self.assertRaises(ValueError):
            self.q.claim('', 'worker')
        with self.assertRaises(ValueError):
            self.q.claim('t', '')
        with self.assertRaises(ValueError):
            self.q.ack('', 'abc', 'tok')
        with self.assertRaises(ValueError):
            self.q.ack('t', '', 'tok')
        with self.assertRaises(ValueError):
            self.q.ack('t', 'abc', '')
        with self.assertRaises(ValueError):
            self.q.nack('t', 'abc', '', delay=1)
        with self.assertRaises(ValueError):
            self.q.peek('', 'abc')
        with self.assertRaises(ValueError):
            self.q.peek('t', '')

    def test_invalid_numbers_rejected(self):
        with self.assertRaises(ValueError):
            self.q.enqueue('t', 'k', {}, not_before=True)
        with self.assertRaises(ValueError):
            self.q.enqueue('t', 'k', {}, not_before=float('nan'))
        with self.assertRaises(ValueError):
            self.q.enqueue('t', 'k', {}, not_before=float('inf'))
        with self.assertRaises(ValueError):
            self.q.enqueue('t', 'k', {}, not_before=0, expires_at=True)
        with self.assertRaises(ValueError):
            self.q.enqueue('t', 'k', {}, not_before=0, expires_at=float('inf'))
        with self.assertRaises(ValueError):
            self.q.enqueue('t', 'k', {}, not_before=5, expires_at=5)
        with self.assertRaises(ValueError):
            self.q.enqueue('t', 'k', {}, not_before=5, expires_at=4)

    def test_invalid_claim_arguments_raise_before_mutation(self):
        job_id = self.q.enqueue('t', 'k', {})['id']
        with self.assertRaises(ValueError):
            self.q.claim('t', 'w', limit=0)
        with self.assertRaises(ValueError):
            self.q.claim('t', 'w', limit=-1)
        with self.assertRaises(ValueError):
            self.q.claim('t', 'w', limit=True)
        with self.assertRaises(ValueError):
            self.q.claim('t', 'w', limit=1.5)
        with self.assertRaises(ValueError):
            self.q.claim('t', 'w', lease_seconds=0)
        with self.assertRaises(ValueError):
            self.q.claim('t', 'w', lease_seconds=-2)
        with self.assertRaises(ValueError):
            self.q.claim('t', 'w', lease_seconds=True)
        with self.assertRaises(ValueError):
            self.q.claim('t', 'w', lease_seconds=float('nan'))
        self.assertEqual(self.q.peek('t', job_id)['status'], 'pending')

    def test_invalid_nack_delay_raises_even_for_missing_job(self):
        with self.assertRaises(ValueError):
            self.q.nack('t', 'missing', 'tok', delay=-1)
        with self.assertRaises(ValueError):
            self.q.nack('t', 'missing', 'tok', delay=True)
        with self.assertRaises(ValueError):
            self.q.nack('t', 'missing', 'tok', delay=float('nan'))


class IdempotencyTests(unittest.TestCase):
    def test_exact_replay_returns_existing_snapshot(self):
        q = Queue(lambda: 3)
        first = q.enqueue('news', 'a', {'title': 'hello'}, not_before=1, expires_at=9)
        again = q.enqueue('news', 'a', {'title': 'hello'}, not_before=1, expires_at=9)
        self.assertEqual(first['id'], again['id'])
        self.assertEqual(first['status'], again['status'])
        self.assertEqual(again['payload'], {'title': 'hello'})
        self.assertEqual(again['not_before'], 1)
        self.assertEqual(again['expires_at'], 9)

    def test_conflicting_replay_raises_and_keeps_original(self):
        q = Queue(lambda: 3)
        first = q.enqueue('news', 'a', {'title': 'hello'})
        with self.assertRaises(ConflictError):
            q.enqueue('news', 'a', {'title': 'goodbye'})
        with self.assertRaises(ConflictError):
            q.enqueue('news', 'a', {'title': 'hello'}, not_before=7)
        with self.assertRaises(ConflictError):
            q.enqueue('news', 'a', {'title': 'hello'}, not_before=0, expires_at=42)
        self.assertEqual(q.peek('news', first['id'])['status'], 'pending')
        self.assertEqual(q.peek('news', first['id'])['payload'], {'title': 'hello'})

    def test_tenant_scoped_idempotency_key(self):
        q = Queue()
        j1 = q.enqueue('t1', 'k', {'v': 1})
        j2 = q.enqueue('t2', 'k', {'v': 1})
        self.assertNotEqual(j1['id'], j2['id'])
        self.assertEqual(q.claim('t1', 'w')[0]['id'], j1['id'])
        self.assertEqual(q.claim('t2', 'w')[0]['id'], j2['id'])


class DeepSnapshotTests(unittest.TestCase):
    def test_enqueue_stores_deep_snapshot(self):
        q = Queue()
        payload = {'title': 'hello', 'tags': ['a']}
        job = q.enqueue('t', 'k', payload)
        payload['title'] = 'mutated'
        payload['tags'].append('b')
        self.assertEqual(q.peek('t', job['id'])['payload'], {'title': 'hello', 'tags': ['a']})

    def test_returned_snapshots_are_deep(self):
        q = Queue(lambda: 0)
        job = q.enqueue('t', 'k', {'title': 'hello'})
        leaked = q.peek('t', job['id'])
        leaked['payload']['title'] = 'oops'
        leaked['status'] = 'done'
        self.assertEqual(q.peek('t', job['id'])['payload'], {'title': 'hello'})
        self.assertEqual(q.peek('t', job['id'])['status'], 'pending')

        leased = q.claim('t', 'w')[0]
        leased['payload']['title'] = 'oops'
        self.assertEqual(q.peek('t', leased['id'])['payload'], {'title': 'hello'})
        self.assertEqual(leased['status'], 'leased')

    def test_peek_unknown_or_other_tenant_is_none(self):
        q = Queue()
        self.assertIsNone(q.peek('t', 'missing'))
        job = q.enqueue('t1', 'k', {})
        self.assertIsNone(q.peek('t2', job['id']))


class ClaimTests(unittest.TestCase):
    def test_order_is_not_before_then_insertion_sequence(self):
        q = Queue(lambda: 0)
        j1 = q.enqueue('t', 'k1', {}, not_before=5)
        j2 = q.enqueue('t', 'k2', {}, not_before=1)
        j3 = q.enqueue('t', 'k3', {}, not_before=1)
        got = q.claim('t', 'w', limit=2)
        self.assertEqual([g['id'] for g in got], [j2['id'], j3['id']])

    def test_limit_respected(self):
        q = Queue(lambda: 0)
        ids = [q.enqueue('t', 'k%d' % i, {})['id'] for i in range(5)]
        self.assertEqual(len(q.claim('t', 'w', limit=2)), 2)
        self.assertEqual(q.claim('t', 'w', limit=2)[0]['id'], ids[2])
        self.assertEqual(q.claim('t', 'w', limit=2)[0]['id'], ids[3])
        self.assertEqual(q.claim('t', 'w', limit=2), [])

    def test_claim_is_tenant_scoped(self):
        q = Queue(lambda: 0)
        ja = q.enqueue('tenant-a', 'k', {})
        jb = q.enqueue('tenant-b', 'k', {})
        self.assertEqual(len(q.claim('tenant-b', 'w')), 1)
        self.assertEqual(q.claim('tenant-b', 'w'), [])
        self.assertEqual(len(q.claim('tenant-a', 'w')), 1)

    def test_lease_seconds_and_token_rotation(self):
        q = Queue(lambda: 0)
        job = q.enqueue('t', 'k', {})
        first = q.claim('t', 'w', lease_seconds=10)[0]
        self.assertEqual(first['lease_until'], 10)
        self.assertTrue(q.ack('t', job['id'], first['token']))

        q2 = Queue(lambda: 20)
        job2 = q2.enqueue('t', 'k2', {})
        leased = q2.claim('t', 'w', lease_seconds=5)[0]
        self.assertEqual(leased['lease_until'], 25)
        self.assertTrue(q2.ack('t', job2['id'], leased['token']))

        q3 = Queue(lambda: 0)
        job3 = q3.enqueue('t', 'k3', {})
        l3 = q3.claim('t', 'w', lease_seconds=5)[0]
        q3.clock = lambda: 5
        l3b = q3.claim('t', 'other')[0]
        self.assertNotEqual(l3b['token'], l3['token'])
        self.assertFalse(q3.ack('t', job3['id'], l3['token']))
        self.assertTrue(q3.ack('t', job3['id'], l3b['token']))

    def test_expired_jobs_never_claimed_and_are_terminal(self):
        q = Queue(lambda: 10)
        job = q.enqueue('t', 'k', {}, not_before=0, expires_at=5)
        self.assertEqual(q.claim('t', 'w'), [])
        self.assertEqual(q.peek('t', job['id'])['status'], 'expired')
        self.assertFalse(q.ack('t', job['id'], 'tok'))
        self.assertFalse(q.nack('t', job['id'], 'tok', delay=1))

    def test_expired_leased_job_not_claimable(self):
        q = Queue(lambda: 0)
        job = q.enqueue('t', 'k', {}, expires_at=8)
        leased = q.claim('t', 'w', lease_seconds=10)[0]
        self.assertTrue(q.ack('t', job['id'], leased['token']))
        q2 = Queue(lambda: 9)
        job2 = q2.enqueue('t', 'k2', {}, expires_at=8)
        leased2 = q2.claim('t', 'w', lease_seconds=10)[0]
        self.assertFalse(q2.ack('t', job2['id'], leased2['token']))
        self.assertEqual(q2.claim('t', 'w'), [])
        self.assertEqual(q2.peek('t', job2['id'])['status'], 'expired')


class AckNackTests(unittest.TestCase):
    def test_ack_requirements(self):
        q = Queue(lambda: 0)
        job = q.enqueue('t', 'k', {})
        leased = q.claim('t', 'w')[0]
        self.assertTrue(q.ack('t', job['id'], leased['token']))
        self.assertFalse(q.ack('t', job['id'], leased['token']))
        self.assertFalse(q.ack('t', 'other', leased['token']))
        self.assertFalse(q.ack('other', job['id'], leased['token']))

        q2 = Queue(lambda: 0)
        job2 = q2.enqueue('t', 'k', {})
        leased2 = q2.claim('t', 'w', lease_seconds=5)[0]
        self.assertFalse(q2.ack('t', job2['id'], 'wrong-token'))
        q2.clock = lambda: 5
        self.assertFalse(q2.ack('t', job2['id'], leased2['token']))

        q3 = Queue(lambda: 0)
        job3 = q3.enqueue('t', 'k', {}, expires_at=4)
        leased3 = q3.claim('t', 'w', lease_seconds=10)[0]
        q3.clock = lambda: 4
        self.assertFalse(q3.ack('t', job3['id'], leased3['token']))

    def test_nack_requeues_with_delay_and_invalidates_token(self):
        q = Queue(lambda: 0)
        job = q.enqueue('t', 'k', {})
        leased = q.claim('t', 'w')[0]
        self.assertTrue(q.nack('t', job['id'], leased['token'], delay=3))
        self.assertEqual(q.peek('t', job['id'])['status'], 'pending')
        self.assertEqual(q.peek('t', job['id'])['not_before'], 3)
        self.assertFalse(q.ack('t', job['id'], leased['token']))
        self.assertTrue(q.claim('t', 'w')[0]['id'])
        self.assertFalse(q.ack('t', job['id'], leased['token']))

    def test_nack_requires_valid_token(self):
        q = Queue(lambda: 0)
        job = q.enqueue('t', 'k', {})
        leased = q.claim('t', 'w', lease_seconds=5)[0]
        self.assertFalse(q.nack('t', job['id'], 'wrong', delay=1))
        self.assertTrue(q.nack('t', job['id'], leased['token'], delay=0))
        self.assertEqual(q.peek('t', job['id'])['status'], 'pending')


class ConcurrencyTests(unittest.TestCase):
    def test_concurrent_claims_never_overlap(self):
        q = Queue()
        for i in range(12):
            q.enqueue('t', 'k%d' % i, {})
        claimed_ids = []
        lock = threading.Lock()

        def run():
            while True:
                batch = q.claim('t', 'w', limit=2)
                if not batch:
                    return
                with lock:
                    claimed_ids.extend(j['id'] for j in batch)

        threads = [threading.Thread(target=run) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(len(claimed_ids), 12)
        self.assertEqual(len(set(claimed_ids)), 12)


if __name__ == '__main__':
    unittest.main()
