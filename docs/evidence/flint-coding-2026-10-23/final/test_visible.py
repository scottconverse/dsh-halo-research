import unittest
from queue_store import Queue

class Smoke(unittest.TestCase):
    def test_basic(self):
        q=Queue(lambda:10)
        job=q.enqueue('news','a',{'title':'hello'})
        leased=q.claim('news','worker')[0]
        self.assertEqual(job['id'],leased['id'])
        self.assertTrue(q.ack('news',job['id'],leased['token']))
        self.assertEqual(q.peek('news',job['id'])['status'],'done')

if __name__=='__main__': unittest.main()
