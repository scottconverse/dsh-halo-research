
import sys
print("Python executable:", sys.executable)

# Check if our envelope module can be imported
try:
    import src.halo_research_gateway.envelope as env
    print("Envelope module imported successfully")
    
    # Test the constants
    print("SCHEMA_VERSION:", env.SCHEMA_VERSION)
    
    # Test basic function calls
    result = env.build_envelope(
        tool="test_tool",
        provider="test_provider", 
        request_id="test_request_123",
        requested_at="2023-01-01T00:00:00Z",
        completed_at="2023-01-01T00:00:01Z",
        items=[{"id": 1, "name": "item1"}],
        requested=1,
        available=1,
        char_budget=1000
    )
    
    print("Build envelope result keys:", list(result.keys()))
    print("Success!")
except Exception as e:
    print("Error:", str(e))
    import traceback
    traceback.print_exc()
