
# Simple test script to verify our envelope implementation works
import sys

print("Testing envelope module...")

try:
    # Try to import and run basic checks
    import json
    
    # Import the actual code we wrote  
    exec(open('src/halo_research_gateway/envelope.py').read())
    
    print("SCHEMA_VERSION:", SCHEMA_VERSION)
    print("Module imported successfully")
    
    # Test a minimal call 
    result = build_envelope(
        tool="test",
        provider="test_provider", 
        request_id="test123",
        requested_at="2023-01-01T00:00:00Z",
        completed_at="2023-01-01T00:01:00Z",
        items=[{"id": 1}],
        requested=1,
        available=1,
        char_budget=1000
    )
    
    print("Basic test passed")
    print("Result keys:", list(result.keys()))
    print("Ok value:", result["ok"])
    
except Exception as e:
    print("Error in simple test:", str(e))
    import traceback
    traceback.print_exc()
