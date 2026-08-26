
import sys
sys.path.insert(0, '.')

# Test our migration functionality directly  
try:
    from halo_research_gateway.migrations import migrate
    print("✅ Migration module imported successfully")
    
    # Try a simple test with tmp_path equivalent
    import tempfile
    import os
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = os.path.join(tmp_dir, "gateway.db")  
        backup_path = os.path.join(tmp_dir, "backups")
        
        print(f"Testing migration on {db_path}")
        migrate(db_path, backup_path)
        
        # Check if tables were created
        import sqlite3
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            print(f"✅ Tables created: {tables}")
            
            # Check user version  
            cursor = conn.execute("PRAGMA user_version")
            version = cursor.fetchone()[0]
            print(f"✅ Schema version: {version}")
            
            # Check schema_meta
            try:
                cursor = conn.execute("SELECT * FROM schema_meta WHERE component='cache'")
                meta_row = cursor.fetchone()
                if meta_row:
                    print(f"✅ schema_meta entry found: {meta_row}")
                else:
                    print("❌ No schema_meta entry found")
            except Exception as e:
                print(f"❌ Error querying schema_meta: {e}")
                
        print("✅ Migration test completed successfully")
        
except Exception as e:
    print(f"❌ Test failed with error: {e}")
    import traceback
    traceback.print_exc()
