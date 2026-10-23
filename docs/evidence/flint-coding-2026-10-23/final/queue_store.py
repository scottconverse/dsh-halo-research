"""Small in-memory dispatch queue. See SPEC.md for the required contract."""
import copy
import math
import threading
import time
import uuid


class ConflictError(ValueError):
    pass


class Queue:
    """In-memory, thread-safe newsroom dispatch queue."""

    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.jobs = {}
        self.keys = {}
        self.orig = {}
        self.sequence = 0
        self._lock = threading.RLock()

    # ------------------------------------------------------------------ helpers

    @staticmethod
    def _require_id(value, name):
        if not isinstance(value, str) or value == '':
            raise ValueError("%s must be a nonempty string" % name)
        return value

    @staticmethod
    def _require_number(value, name):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("%s must be a finite real number" % name)
        if not math.isfinite(value):
            raise ValueError("%s must be a finite real number" % name)
        return value

    def _snapshot(self, job):
        return {
            'id': job['id'],
            'tenant': job['tenant'],
            'key': job['key'],
            'payload': copy.deepcopy(job['payload']),
            'not_before': job['not_before'],
            'expires_at': job['expires_at'],
            'status': job['status'],
            'owner': job['owner'],
            'token': job['token'],
            'lease_until': job['lease_until'],
            'sequence': job['sequence'],
        }

    # ------------------------------------------------------------------- enqueue

    def enqueue(self, tenant, key, payload, not_before=0, expires_at=None):
        self._require_id(tenant, 'tenant')
        self._require_id(key, 'key')
        self._require_number(not_before, 'not_before')
        if expires_at is not None:
            self._require_number(expires_at, 'expires_at')
            if not expires_at > not_before:
                raise ValueError('expires_at must be strictly greater than not_before')
        with self._lock:
            job_id = self.keys.get((tenant, key))
            if job_id is not None:
                job = self.jobs.get(job_id)
                if job is not None:
                    orig = self.orig[job_id]
                    if (payload == orig[0] and not_before == orig[1]
                            and expires_at == orig[2]):
                        return self._snapshot(job)
                    raise ConflictError(
                        'conflicting replay for idempotency key (%r, %r)' % (tenant, key))
            self.sequence += 1
            job = {
                'id': uuid.uuid4().hex,
                'tenant': tenant,
                'key': key,
                'payload': copy.deepcopy(payload),
                'not_before': not_before,
                'expires_at': expires_at,
                'status': 'pending',
                'owner': None,
                'token': None,
                'lease_until': None,
                'sequence': self.sequence,
            }
            self.jobs[job['id']] = job
            self.keys[(tenant, key)] = job['id']
            self.orig[job['id']] = (job['payload'], not_before, expires_at)
            return self._snapshot(job)

    # --------------------------------------------------------------------- claim

    def claim(self, tenant, owner, limit=1, lease_seconds=30):
        self._require_id(tenant, 'tenant')
        self._require_id(owner, 'owner')
        if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
            raise ValueError('limit must be a positive integer')
        if isinstance(lease_seconds, bool) or not isinstance(lease_seconds, (int, float)):
            raise ValueError('lease_seconds must be a positive finite number')
        if not math.isfinite(lease_seconds) or lease_seconds <= 0:
            raise ValueError('lease_seconds must be a positive finite number')
        with self._lock:
            now = self.clock()
            for job in self.jobs.values():
                if job['tenant'] != tenant:
                    continue
                if job['status'] in ('done', 'expired'):
                    continue
                expires_at = job['expires_at']
                if expires_at is not None and expires_at <= now:
                    job['status'] = 'expired'
                    job['owner'] = None
                    job['token'] = None
                    job['lease_until'] = None
            candidates = []
            for job in self.jobs.values():
                if job['tenant'] != tenant:
                    continue
                if job['status'] in ('done', 'expired'):
                    continue
                if job['status'] == 'pending':
                    if job['not_before'] > now:
                        continue
                else:
                    if job['lease_until'] > now:
                        continue
                candidates.append(job)
            candidates.sort(key=lambda j: (j['not_before'], j['sequence']))
            claimed = []
            for job in candidates:
                if len(claimed) >= limit:
                    break
                token = uuid.uuid4().hex
                job['status'] = 'leased'
                job['owner'] = owner
                job['token'] = token
                job['lease_until'] = now + lease_seconds
                claimed.append(self._snapshot(job))
            return claimed

    # ----------------------------------------------------------------------- ack

    def ack(self, tenant, job_id, token):
        self._require_id(tenant, 'tenant')
        self._require_id(job_id, 'job id')
        self._require_id(token, 'token')
        with self._lock:
            job = self.jobs.get(job_id)
            if job is None or job['tenant'] != tenant:
                return False
            if job['status'] != 'leased' or job['token'] != token:
                return False
            now = self.clock()
            if not now < job['lease_until']:
                return False
            if job['expires_at'] is not None and not now < job['expires_at']:
                return False
            job['status'] = 'done'
            job['owner'] = None
            job['token'] = None
            job['lease_until'] = None
            return True

    # ----------------------------------------------------------------------- nack

    def nack(self, tenant, job_id, token, delay=0):
        self._require_id(tenant, 'tenant')
        self._require_id(job_id, 'job id')
        self._require_id(token, 'token')
        if isinstance(delay, bool) or not isinstance(delay, (int, float)):
            raise ValueError('delay must be a finite nonnegative number')
        if not math.isfinite(delay) or delay < 0:
            raise ValueError('delay must be a finite nonnegative number')
        with self._lock:
            job = self.jobs.get(job_id)
            if job is None or job['tenant'] != tenant:
                return False
            if job['status'] != 'leased' or job['token'] != token:
                return False
            now = self.clock()
            if not now < job['lease_until']:
                return False
            if job['expires_at'] is not None and not now < job['expires_at']:
                return False
            job['status'] = 'pending'
            job['not_before'] = now + delay
            job['owner'] = None
            job['token'] = None
            job['lease_until'] = None
            return True

    # ----------------------------------------------------------------------- peek

    def peek(self, tenant, job_id):
        self._require_id(tenant, 'tenant')
        self._require_id(job_id, 'job id')
        with self._lock:
            job = self.jobs.get(job_id)
            if job is None or job['tenant'] != tenant:
                return None
            return self._snapshot(job)
