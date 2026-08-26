import json
import base64
from src.halo_research_gateway.envelope import build_envelope

# Test case to verify the fixes work correctly

# Create test data
items = [
    {"id": 1, "data": "small item"},
    {"id": 2, "data": "another small item"}, 
    {"id": 3, "data": "yet another small item"}
]

print("Testing envelope implementation...")
try:
    pages = list(build_envelope(items, char_budget=500))
    print(f"Generated {len(pages)} pages")
    
    for i, page in enumerate(pages):
        print(f"Page {i+1}: {len(page['items'])} items, cursor: {page.get('cursor', 'None')}")
        
    # Test serialization length
    if pages:
        env = {"page": {
            "items": pages[0]["items"],
            "cursor": pages[0]["cursor"],
            "serialized_chars": 0,
            "warnings": []
        }}
        serialized_length = len(json.dumps(env))
        print(f"Serialized chars: {serialized_length}")
        
    print("Test completed successfully")
    
except Exception as e:
    print(f"Error in test: {e}")
    import traceback
    traceback.print_exc()
