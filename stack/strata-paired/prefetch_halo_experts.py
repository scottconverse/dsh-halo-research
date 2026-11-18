"""Preload only the ranked expert ranges that Strata uploads at startup."""
import ctypes as c
from ctypes import wintypes as w
import json
from pathlib import Path
import re
import struct
import sys
import time

from halo import preflight, free_gib, commit_free_gib, psutil
from gguf import GGUFReader


class MemoryRange(c.Structure):
    _fields_ = [('address', c.c_void_p), ('length', c.c_size_t)]


def prefetch_experts(config, slots):
    args = config['args']
    profile = Path(args[args.index('--expert-profile') + 1]).read_bytes()
    magic, version, layers, experts, capacity, num_pairs = struct.unpack_from('<4s5I', profile)
    if magic != b'STRP' or version != 1 or not 0 < slots <= num_pairs <= capacity:
        raise ValueError('Unexpected expert profile')
    reader = GGUFReader(args[args.index('--native') + 1])
    pairs = list(struct.iter_unpack('<HH', profile[24:24 + slots * 4]))
    roles = {}
    for tensor in reader.tensors:
        match = re.fullmatch(r'blk\.(\d+)\.ffn_(gate|up|down)_exps\.weight', tensor.name)
        if not match:
            continue
        if int(tensor.shape[-1]) != experts or tensor.n_bytes % experts:
            raise ValueError(f'Unexpected expert layout for {tensor.name}')
        roles.setdefault(int(match[1]), []).append((int(tensor.data_offset), tensor.n_bytes // experts))
    if len(roles) != layers or any(len(row) != 3 for row in roles.values()):
        raise ValueError('Expected three expert tensors per model layer')
    ranges = []
    for layer, expert in pairs:
        if not 0 <= layer < layers or not 0 <= expert < experts:
            raise ValueError('Expert rank outside model')
        for start, size in roles[layer]:
            start += expert * size
            if start + size > reader.data.nbytes:
                raise ValueError('Expert range outside file')
            ranges.append((start, start + size))
    merged = []
    for lo, hi in sorted(ranges):
        if merged and lo <= merged[-1][1]:
            merged[-1][1] = max(hi, merged[-1][1])
        else:
            merged.append([lo, hi])
    base = reader.data.ctypes.data
    kernel = c.WinDLL('kernel32', use_last_error=True)
    kernel.GetCurrentProcess.restype = w.HANDLE
    pvm = kernel.PrefetchVirtualMemory
    pvm.argtypes = [w.HANDLE, c.c_size_t, c.POINTER(MemoryRange), w.ULONG]
    pvm.restype = w.BOOL
    handle = kernel.GetCurrentProcess()
    before = psutil.disk_io_counters().read_bytes
    start = time.monotonic()
    total = sum(hi - lo for lo, hi in merged)
    print(f'Prefetching {slots} expert pairs, {total / 2**30:.2f} GiB across {len(merged)} contiguous ranges', flush=True)
    for index in range(0, len(merged), 256):
        if time.monotonic() - start >= 120:
            raise TimeoutError('Expert prefetch exceeded two minutes')
        if free_gib() < 5 or commit_free_gib() < 4:
            raise RuntimeError('Memory safety guard during expert prefetch')
        batch = merged[index:index + 256]
        request = (MemoryRange * len(batch))(*(MemoryRange(base + lo, hi - lo) for lo, hi in batch))
        if not pvm(handle, len(batch), request, 0):
            raise c.WinError(c.get_last_error())
    return {'slots': slots, 'range_gib': total / 2**30,
            'elapsed_seconds': time.monotonic() - start,
            'host_disk_read_gib': (psutil.disk_io_counters().read_bytes - before) / 2**30}


if __name__ == '__main__':
    config, _, _ = preflight(capped=True)
    print(json.dumps(prefetch_experts(config, int(sys.argv[1]))), flush=True)
