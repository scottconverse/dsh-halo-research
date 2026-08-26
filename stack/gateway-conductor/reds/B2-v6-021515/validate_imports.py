import sys
sys.path.insert(0, '.')

# Test imports first
try:
    from halo_research_gateway.cache import Cache
    print("✓ Cache import successful")
except ImportError as e:
    print(f"✗ Cache import failed: {e}")

try:
    from halo_research_gateway.migrations import migrate  
    print("✓ Migrate import successful")
except ImportError as e:
    print(f"✗ Migrate import failed: {e}")

try:
    from halo_research_gateway.cache_errors import SchemaTooNewError, EntryTooLargeError
    print("✓ Cache errors imports successful") 
except ImportError as e:
    print(f"✗ Cache errors imports failed: {e}")

print("Validation complete")
