# Reproduce the behavioral grading

From this directory, use Python3.13:

```powershell
python grader.py final reproduced-result.json
python -m unittest discover -s final -v
```

The hidden grader passes30/30 on the unchanged model implementation. The delivered tests intentionally remain as produced, including four incorrect cases; their failure is part of the record. See [the report](../../HALO-FLINT-CODING-2026-10-23.md). No model or network is needed to repeat these checks.
