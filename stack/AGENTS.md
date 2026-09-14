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
installation remains under `C:\Users\scott\.dsh-stock` and LM Studio. Mission
Control is installed under `C:\Users\scott\.dsh-stock\mission-control` and is
served on loopback port 3090. The supported launcher opens Mission Control in
Google Chrome; the supported stop path stops Mission Control, DSH, and Wigolo
while leaving LM Studio and the approved resident models running. The Research
folder is Scott's primary reading location and must not be left stale.
