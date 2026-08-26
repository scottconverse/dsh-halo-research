
import sys
sys.path.insert(0, 'src')
print("Testing cache stats return type...")

# Import and test a simple case  
from halo_research_gateway.cache import Cache
from datetime import datetime
import tempfile
import os

try:
    with tempfile.TemporaryDirectory() as tmp_dir: 
        db_path = os.path.join(tmp_dir, "test.db")
        
        # Create cache instance
        cache = Cache(db_path, 1000000, 500000) 
        
        # Test stats method return type  
        result = cache.stats()
        print(f"Stats result: {result}")
        print(f"Type of result: {type(result)}")
        
        if isinstance(result, dict):
            print("SUCCESS: stats() returns dict as expected") 
        else:
            print("FAILED: stats() does not return dict")

except Exception as e:
    import traceback
    print(f"Error in test: {e}")
    traceback.print_exc()
