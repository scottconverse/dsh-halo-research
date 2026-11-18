"""Windows available memory and verified hard working-set limits."""
import ctypes
from ctypes import wintypes

class MemoryStatus(ctypes.Structure):
    _fields_ = [
        ('length', wintypes.DWORD), ('load', wintypes.DWORD),
        *((field, ctypes.c_uint64) for field in (
            'physical_total', 'physical_available', 'commit_total', 'commit_available',
            'virtual_total', 'virtual_available', 'extended_available',
        )),
    ]


def memory_status():
    status = MemoryStatus()
    status.length = ctypes.sizeof(status)
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.GlobalMemoryStatusEx.argtypes = [ctypes.POINTER(MemoryStatus)]
    if not kernel.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise ctypes.WinError(ctypes.get_last_error())
    return status


def free_gib():
    return memory_status().physical_available / 2**30


def commit_free_gib():
    return memory_status().commit_available / 2**30


def cap_working_set(pid, gib):
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel.OpenProcess.restype = wintypes.HANDLE
    kernel.GetProcessWorkingSetSizeEx.argtypes = [
        wintypes.HANDLE, ctypes.POINTER(ctypes.c_size_t),
        ctypes.POINTER(ctypes.c_size_t), ctypes.POINTER(wintypes.DWORD),
    ]
    kernel.SetProcessWorkingSetSizeEx.argtypes = [
        wintypes.HANDLE, ctypes.c_size_t, ctypes.c_size_t, wintypes.DWORD,
    ]
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    handle = kernel.OpenProcess(0x100 | 0x400, False, pid)
    if not handle:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        low = ctypes.c_size_t()
        high = ctypes.c_size_t()
        flags = wintypes.DWORD()
        if not kernel.GetProcessWorkingSetSizeEx(handle, ctypes.byref(low), ctypes.byref(high), ctypes.byref(flags)):
            raise ctypes.WinError(ctypes.get_last_error())
        expected = int(gib * 2**30)
        if not kernel.SetProcessWorkingSetSizeEx(handle, low.value, expected, 4):
            raise ctypes.WinError(ctypes.get_last_error())
        if not kernel.GetProcessWorkingSetSizeEx(handle, ctypes.byref(low), ctypes.byref(high), ctypes.byref(flags)):
            raise ctypes.WinError(ctypes.get_last_error())
        if not flags.value & 4 or high.value != expected:
            raise RuntimeError('Working-set cap not effective')
        return {'pid': pid, 'minimum': low.value, 'maximum': high.value, 'flags': flags.value}
    finally:
        kernel.CloseHandle(handle)
