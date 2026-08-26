# GATE FEEDBACK - round 2

The external verifier rejected the work. Exact output:

```

=================================== ERRORS ====================================
________________ ERROR collecting tests/unit/test_security.py _________________
tests\unit\test_security.py:5: in <module>
    from halo_research_gateway.security import (
src\halo_research_gateway\security.py:33: in <module>
    def validate_redirect(source: str, target: str) -> URLResult:
                                                       ^^^^^^^^^
E   NameError: name 'URLResult' is not defined
=========================== short test summary info ===========================
ERROR tests/unit/test_security.py - NameError: name 'URLResult' is not defined
!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
1 error in 0.14s

RESULT: FAIL (acceptance command exit 2)
```

