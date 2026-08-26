
import sys
sys.path.insert(0, 'src')

# Import and basic functionality check 
try:
    from halo_research_gateway.cache import Cache
    from halo_research_gateway.migrations import migrate
    from halo_research_gateway.cache_errors import SchemaTooNewError, EntryTooLargeError
    
    print("All imports successful")
    
    # Test creating a cache instance
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = f.name
        
    try:
        cache = Cache(db_path, 1024*1024, 1024*1024)
        print("Cache instantiation successful")
        
        # Test putting/getting data
        cache.put('test_key', b'test_value', 3600)
        result = cache.get('test_key')
        print(f"Get result: {result}")
        
        # Check stats
        stats = cache.stats()
        print(f"Stats: {stats}")
        
        # Test eviction (should be able to run without errors) 
        cache.evict()
        print("Eviction successful")
        
    except Exception as e:
        print(f"Error in functionality test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)
            
except Exception as e:
    print(f"Import error: {e}")
    import traceback
    traceback.print_exc()
