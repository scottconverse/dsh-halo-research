SCOPE: Halo stack configuration tasks only.

# Halo configuration documentation rule

Whenever a task materially changes the Halo stack, update the current
human-readable configuration record and recovery copy before declaring the
task complete.

Required user-facing location:

`C:\Users\scott\Desktop\Halo Stack Research`

At minimum, synchronize:

- `HALO-CURRENT-CONFIGURATION.md`
- `HALO-STACK-GUIDE.md` when operating behavior changes
- `HALO-DSH-IMPLEMENTATION-2026-08-27.md` or its dated successor
- `Current Halo Configuration\` copies of every changed deployable
  configuration file
- `Current Halo Configuration\MANIFEST-SHA256.txt`

The executable canonical files remain under this stack directory and the live
installation remains under `C:\Users\scott\.dsh` and LM Studio. The Research
folder is Scott's primary reading location and must not be left stale.
