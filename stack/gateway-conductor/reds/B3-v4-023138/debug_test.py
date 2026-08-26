
import sys
sys.path.insert(0, '.')
from halo_research_gateway.security import validate_url

try:
    result = validate_url("http://192.168.1.1:8080")
    print(f"SUCCESS: host={result.host}, port={result.port}")
except Exception as e:
    print(f"ERROR: {e}")
    
try:
    result = validate_url("http://10.0.0.1/path")  
    print(f"UNEXPECTED SUCCESS: host={result.host}, port={result.port}")
except Exception as e:
    print(f"EXPECTED ERROR: {e}")
