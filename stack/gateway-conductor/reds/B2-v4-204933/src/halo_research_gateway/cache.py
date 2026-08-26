"""SQLite-backed cache for Halo Research Gateway."""

import sqlite3
import gzip
import os
from contextlib import closing
from datetime import datetime, timedelta
from typing import Optional, Tuple

from halo_research_gateway.cache_errors import EntryTooLargeError


class Cache:
    """SQLite-backed cache with TTL and LRU eviction."""
    
    def __init__(self, db_path: str, max_bytes: int, entry_max_bytes: int, clock=None):
        """
        Initialize the cache.
        
        Args:
            db_path: Path to SQLite database file
            max_bytes: Maximum total bytes to use for cached entries
            entry_max_bytes: Maximum size (in bytes) for a single cache entry
            clock: Callable returning UTC datetime (defaults to datetime.utcnow)
        """
        self.db_path = db_path
        self.max_bytes = max_bytes
        self.entry_max_bytes = entry_max_bytes
        self.clock = clock or datetime.utcnow
        
    def put(self, key: str, value: bytes, ttl_seconds: int) -> None:
        """
        Store a value in cache with TTL.
        
        Args:
            key: Cache key 
            value: Value to store (bytes)
            ttl_seconds: Time-to-live in seconds
            
        Raises:
            EntryTooLargeError: If the compressed entry exceeds entry_max_bytes
            NotImplementedError: If storage_kind is 'file' (not implemented yet)
        """
        # Compress the value
        compressed_value = gzip.compress(value)
        
        if len(compressed_value) > self.entry_max_bytes:
            raise EntryTooLargeError(
                f"Entry size {len(compressed_value)} exceeds maximum allowed "
                f"{self.entry_max_bytes} bytes"
            )
            
        with closing(sqlite3.connect(self.db_path)) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            
            # Calculate expiry time
            now = self.clock()
            expires_at = (now + timedelta(seconds=ttl_seconds)).isoformat()
            created_at = now.isoformat()
            last_accessed_at = created_at
            
            # Store the entry with inline storage
            conn.execute("""
                INSERT OR REPLACE INTO cache_entries (
                    cache_key, provider, operation, result_schema_version,
                    payload_schema_version, created_at, expires_at, 
                    last_accessed_at, status_code, storage_kind,
                    content_encoding, inline_payload, body_digest,
                    body_relative_path, compressed_bytes, uncompressed_bytes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                key,  # cache_key
                "",   # provider 
                "",   # operation
                "",   # result_schema_version
                0,    # payload_schema_version
                created_at,
                expires_at,
                last_accessed_at,
                None, # status_code
                "inline",  # storage_kind (only inline supported for now)
                "gzip",    # content_encoding 
                compressed_value,   # inline_payload
                "",   # body_digest
                "",   # body_relative_path
                len(compressed_value),   # compressed_bytes
                len(value)               # uncompressed_bytes
            ))
            
            conn.commit()
            
    def get(self, key: str, max_age_seconds: Optional[int] = None) -> Optional[bytes]:
        """
        Retrieve a value from cache.
        
        Args:
            key: Cache key
            max_age_seconds: If specified, return None if entry is older than this
            
        Returns:
            The original bytes if found and not expired, otherwise None
        """
        with closing(sqlite3.connect(self.db_path)) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            
            # Get the cache entry
            cursor = conn.execute("""
                SELECT inline_payload, uncompressed_bytes, expires_at,
                       last_accessed_at FROM cache_entries WHERE cache_key = ?
            """, (key,))
            
            row = cursor.fetchone()
            if not row:
                return None
                
            compressed_value, uncompressed_size, expires_at_str, last_accessed_at_str = row
            
            # Check expiration
            now = self.clock()
            expires_at = datetime.fromisoformat(expires_at_str)
            
            if now > expires_at:
                return None
                
            # If max_age_seconds is specified and entry is too old, return None  
            if max_age_seconds is not None:
                last_accessed_at = datetime.fromisoformat(last_accessed_at_str)
                age_seconds = (now - last_accessed_at).total_seconds()
                if age_seconds > max_age_seconds:
                    return None
                    
            # Update last accessed time
            conn.execute("""
                UPDATE cache_entries SET last_accessed_at = ?
                WHERE cache_key = ?
            """, (now.isoformat(), key))
            conn.commit()
            
            # Decompress and return value 
            return gzip.decompress(compressed_value)
    
    def evict(self) -> None:
        """
        Remove expired entries and then LRU entries to stay within max_bytes limit.
        
        Only removes from cache_entries table, preserves rate_state rows.
        """
        with closing(sqlite3.connect(self.db_path)) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            
            # First remove expired entries
            now = self.clock()
            conn.execute("""
                DELETE FROM cache_entries 
                WHERE datetime(expires_at) < ?
            """, (now.isoformat(),))
            
            # Then, if needed, remove LRU entries to stay within max_bytes limit
            while True:
                cursor = conn.execute("""
                    SELECT SUM(compressed_bytes) FROM cache_entries
                """)
                total_size = cursor.fetchone()[0]
                
                if not total_size or total_size <= self.max_bytes:
                    break
                    
                # Find the oldest entry and delete it
                cursor = conn.execute("""
                    SELECT cache_key, compressed_bytes 
                    FROM cache_entries 
                    ORDER BY last_accessed_at ASC
                    LIMIT 1
                """)
                row = cursor.fetchone()
                
                if not row:
                    break  # No more entries to remove
                    
                key_to_remove, size = row
                
                conn.execute("DELETE FROM cache_entries WHERE cache_key = ?", (key_to_remove,))
                conn.commit()

    def stats(self) -> Tuple[int, int]:
        """
        Get cache statistics.
        
        Returns:
            Tuple of (entry_count, total_compressed_bytes)
        """
        with closing(sqlite3.connect(self.db_path)) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            
            cursor = conn.execute("""
                SELECT COUNT(*), SUM(compressed_bytes) FROM cache_entries
            """)
            count, size = cursor.fetchone()
            
            return (count or 0, size or 0)
