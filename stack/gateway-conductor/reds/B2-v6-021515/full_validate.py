
import sys
sys.path.insert(0, 'src')

# Test imports with path explicitly set to src 
try:
    import halo_research_gateway.cache as cache_module
    print("✓ Cache module imported successfully")
    
    # Check if it has what we expect
    print(f"  Cache class available: {hasattr(cache_module, 'Cache')}")
except Exception as e:
    print(f"✗ Cache import failed: {e}")

try:
    import halo_research_gateway.migrations as migrations_module 
    print("✓ Migrations module imported successfully")
    
    # Check if it has what we expect
    print(f"  migrate function available: {hasattr(migrations_module, 'migrate')}")
except Exception as e:
    print(f"✗ Migrations import failed: {e}")

try:
    import halo_research_gateway.cache_errors as errors_module
    print("✓ Cache errors module imported successfully")
    
    # Check if it has what we expect 
    print(f"  SchemaTooNewError available: {hasattr(errors_module, 'SchemaTooNewError')}")
    print(f"  EntryTooLargeError available: {hasattr(errors_module, 'EntryTooLargeError')}")
except Exception as e:
    print(f"✗ Cache errors import failed: {e}")

print("Full validation complete")
