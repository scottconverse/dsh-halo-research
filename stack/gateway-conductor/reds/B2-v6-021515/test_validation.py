
import sys
sys.path.insert(0, 'src')
import os
import tempfile
from halo_research_gateway.migrations import migrate

# Test if we can at least execute the basic function 
try:
    # Create test directory
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = os.path.join(tmp_dir, "gateway.db")
        backup_dir = os.path.join(tmp_dir, "backups") 
        
        # This should create a valid database  
        migrate(db_path, backup_dir)
        
        print("Migration function executed successfully")
        print(f"DB exists: {os.path.exists(db_path)}")
        if os.path.exists(db_path):
            import sqlite3
            with sqlite3.connect(db_path) as conn:
                cursor = conn.execute("PRAGMA user_version")
                version = cursor.fetchone()[0]
                print(f"Schema version: {version}")
                
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
