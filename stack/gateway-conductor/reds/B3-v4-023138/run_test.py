import sys
import os

# Add current directory to path 
sys.path.insert(0, os.getcwd())

try:
    from tests.unit.test_security import *
    print("Test imports successful")
except Exception as e:
    print(f"Import error: {e}")

try:
    from src.halo_research_gateway.security import *
    print("Security module imports successfully")
except Exception as e:
    print(f"Security import error: {e}")
