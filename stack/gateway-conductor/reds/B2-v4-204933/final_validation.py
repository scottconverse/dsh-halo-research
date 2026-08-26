
import sys
sys.path.insert(0, '.')

# Test that we can import and use all components properly
try:
    # Test 1: Import all required modules
    from halo_research_gateway.cache import Cache
    from halo_research_gateway.migrations import migrate  
    from halo_research_gateway.cache_errors import SchemaTooNewError, EntryTooLargeError
    print("✅ All imports successful")
    
    # Test 2: Check that migrations work correctly with a simple test
    import tempfile
    import os
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = os.path.join(tmp_dir, "gateway.db")  
        backup_path = os.path.join(tmp_dir, "backups")
        
        # Run migration 
        migrate(db_path, backup_path)
        print("✅ Migration completed without errors")
        
        # Check that tables exist
        import sqlite3
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            required_tables = ['schema_meta', 'cache_entries', 'rate_state', 'request_log']
            missing = [t for t in required_tables if t not in tables]
            if not missing:
                print(f"✅ All required tables created: {tables}")
            else:
                print(f"❌ Missing tables: {missing}")
                
    print("✅ Final validation completed successfully")
    
except Exception as e:
    print(f"❌ Validation failed: {e}")
    import traceback
    traceback.print_exc()
