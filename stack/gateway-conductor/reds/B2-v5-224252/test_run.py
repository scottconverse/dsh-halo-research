
import sys
sys.path.insert(0, 'src')

# Test imports work
try:
    from halo_research_gateway.cache import Cache
    from halo_research_gateway.migrations import migrate
    from halo_research_gateway.cache_errors import SchemaTooNewError, EntryTooLargeError
    print("All imports successful")
except Exception as e:
    print(f"Import error: {e}")

# Test basic functionality 
try:
    import tempfile
    import os
    
    # Create a temporary DB path
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = f.name
        
    # Try to create cache instance  
    cache = Cache(db_path, 1024*1024, 1024*1024)
    print("Cache instantiation successful")
    
    # Cleanup
    os.unlink(db_path)
    
except Exception as e:
    print(f"Basic functionality error: {e}")
