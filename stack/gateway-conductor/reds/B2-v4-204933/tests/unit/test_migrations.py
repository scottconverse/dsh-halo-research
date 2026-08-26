"""Tests for database migrations."""

import pytest
import sqlite3
from pathlib import Path

from halo_research_gateway.migrations import migrate
from halo_research_gateway.cache_errors import SchemaTooNewError


def test_migrate_creates_schema(tmp_path):
    """Test that migrate function creates the schema properly."""
    db = tmp_path / "gateway.db"
    backups = tmp_path / "backups" 
    backups.mkdir()  # Create backups directory
    
    # This should work without error and create tables
    migrate(str(db), str(backups))
    
    # Verify database has correct structure by checking all four tables exist
    with sqlite3.connect(db) as conn:
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        # All required tables should be present
        assert 'schema_meta' in tables
        assert 'cache_entries' in tables  
        assert 'rate_state' in tables
        assert 'request_log' in tables
        
        # Check user_version is set correctly
        cursor = conn.execute("PRAGMA user_version")
        version = cursor.fetchone()[0]
        assert version == 1


def test_migrate_second_run_noop(tmp_path):
    """Test that second migrate changes nothing."""
    db = tmp_path / "gateway.db"
    backups = tmp_path / "backups" 
    backups.mkdir()  # Create backups directory
    
    # First migration
    migrate(str(db), str(backups))
    
    # Get initial state
    with sqlite3.connect(db) as conn:
        cursor = conn.execute("PRAGMA user_version")
        version_before = cursor.fetchone()[0]
        
        # Check schema_meta exists and has correct values  
        cursor = conn.execute("SELECT * FROM schema_meta WHERE component='cache'")
        meta_row = cursor.fetchone()
        assert meta_row is not None
        
    # Second migration (should be no-op)
    migrate(str(db), str(backups))
    
    # Verify nothing changed
    with sqlite3.connect(db) as conn:
        cursor = conn.execute("PRAGMA user_version")
        version_after = cursor.fetchone()[0]
        
        assert version_before == version_after
        
        # Check schema_meta is still there  
        cursor = conn.execute("SELECT * FROM schema_meta WHERE component='cache'")
        meta_row = cursor.fetchone()
        assert meta_row is not None


def test_schema_too_new_error(tmp_path):
    """Test that SchemaTooNewError is raised when database version exceeds supported version."""
    db = tmp_path / "gateway.db"
    
    # Create a database with an artificially high version number 
    with sqlite3.connect(db) as conn:
        conn.execute("PRAGMA user_version = 999")
        conn.commit()
        
    # This should raise SchemaTooNewError
    with pytest.raises(SchemaTooNewError):
        migrate(str(db), str(tmp_path / "backups"))
        
    # The file should be unchanged (no backup created)
    assert db.exists()
    
    # Verify the database is still at version 999
    with sqlite3.connect(db) as conn:
        cursor = conn.execute("PRAGMA user_version")
        version = cursor.fetchone()[0]
        assert version == 999


def test_backup_created_and_capped(tmp_path):
    """Test that migrating an existing db creates a backup; repeated cycles keep only 3 newest."""
    db = tmp_path / "gateway.db"
    backups = tmp_path / "backups" 
    backups.mkdir()
    
    # Create initial database with version 0
    with sqlite3.connect(db) as conn:
        conn.execute("PRAGMA user_version = 0")
        conn.commit()
        
    # First migration - should create backup
    migrate(str(db), str(backups))
    
    # Check backup was created 
    backup_files = list(backups.glob("gateway.db.backup.*"))
    assert len(backup_files) >= 1
    
    # Create more backups to test capping  
    for i in range(5):
        # Recreate database with old version
        with sqlite3.connect(db) as conn:
            conn.execute("PRAGMA user_version = 0")
            conn.commit()
            
        migrate(str(db), str(backups))
        
    backup_files = list(backups.glob("gateway.db.backup.*"))
    assert len(backup_files) == 3  # Only newest 3 backups kept
