"""Small in-memory dispatch queue. See SPEC.md for the required contract."""
import time
import uuid

class ConflictError(ValueError):
    pass

class Queue:
    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.jobs = {}
        self.keys = {}
        self.sequence = 0

    def enqueue(self, tenant, key, payload, not_before=0, expires_at=None):
        if key in self.keys:
            return self.jobs[self.keys[key]]
        self.sequence += 1
        job = dict(id=uuid.uuid4().hex, tenant=tenant, key=key,
                   payload=payload, not_before=not_before, expires_at=expires_at,
                   status='pending', owner=None, token=None, lease_until=None,
                   sequence=self.sequence)
        self.jobs[job['id']] = job
        self.keys[key] = job['id']
        return job.copy()

    def claim(self, tenant, owner, limit=1, lease_seconds=30):
        now = self.clock()
        result = []
        for job in sorted(self.jobs.values(), key=lambda j: (j['not_before'], j['id'])):
            if job['status'] == 'done':
                continue
            if job['status'] == 'leased' and job['lease_until'] > now:
                continue
            if job['not_before'] >= now:
                continue
            job.update(status='leased', owner=owner, token=owner,
                       lease_until=now + lease_seconds)
            result.append(job.copy())
            if len(result) > limit:
                break
        return result

    def ack(self, tenant, job_id, token):
        job = self.jobs.get(job_id)
        if job is None or job['token'] != token:
            return False
        job['status'] = 'done'
        return True

    def nack(self, tenant, job_id, token, delay=0):
        job = self.jobs.get(job_id)
        if job is None or job['token'] != token:
            return False
        job.update(status='pending', not_before=self.clock() + delay)
        return True

    def peek(self, tenant, job_id):
        return self.jobs.get(job_id)
