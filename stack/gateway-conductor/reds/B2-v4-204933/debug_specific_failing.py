"""Debug the specific failing migration test."""

import sqlite3
from pathlib import Path

def debug_migration_test():
    """Reproduce the exact steps from the failing test."""
    # Simulate what tmp_path does - using a temp directory
    db_path = "debug_test.db"
    backups_dir = "debug_backups" 
    
    try:
        # Create backup directory (like tmp_path)
        import os
        os.makedirs(backups_dir, exist_ok=True) 
        
        print(f"=== Creating database at {db_path} ===")
        
        # First migration - should create tables and set version to 1  
        from halo_research_gateway.migrations import migrate
        migrate(db_path, backups_dir)
        
        print("Migration completed successfully")
        
        # Check the state after first migration
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("PRAGMA user_version")
            version_before = cursor.fetchone()[0]
            print(f"Version after first migration: {version_before}")
            
            # List all tables 
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            print(f"Tables created: {tables}")
            
            # Check schema_meta specifically
            try:
                cursor = conn.execute("SELECT * FROM schema_meta")
                meta_rows = cursor.fetchall()
                print(f"schema_meta rows found: {len(meta_rows)}")
                for row in meta_rows:
                    print(f"  Row: {row}")
            except Exception as e:
                print(f"Error querying schema_meta: {e}")
                
        # Second migration (should be no-op)  
        print("\n=== Running second migration ===")
        migrate(db_path, backups_dir)
        
        # Check state after second migration
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("PRAGMA user_version") 
            version_after = cursor.fetchone()[0]
            print(f"Version after second migration: {version_after}")
            
            # Check if anything changed
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables_after = [row[0] for row in cursor.fetchall()]
            print(f"Tables after second run: {tables_after}")
            
            try:
                cursor = conn.execute("SELECT * FROM schema_meta")
                meta_rows = cursor.fetchall()
                print(f"schema_meta rows found after second run: {len(meta_rows)}")
                for row in meta_rows:
                    print(f"  Row: {row}")
            except Exception as e:
                print(f"Error querying schema_meta after second run: {e}")

    finally:
        # Cleanup
        import os, shutil
        try:
            if os.path.exists(db_path):
                os.remove(db_path)
            if os.path.exists(backups_dir):
                shutil.rmtree(backups_dir) 
        except Exception as e:
            print(f"Cleanup error: {e}")

if __name__ == "__main__":
    debug_migration_test()
