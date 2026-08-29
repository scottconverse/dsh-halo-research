import json
from halo_research_gateway.envelope import Envelope, Page, create_envelope

def test_page_respects_char_budget():
    # Create a page with items that should fit within budget but when serialized might not
    page = Page(["item1", "item2"])
    
    # The actual serialization length will be different from what's hard-coded
    envelope = create_envelope([page], char_budget=5000)
    
    # This assertion currently fails because of the hardcoded value issue  
    assert envelope.serialized_chars == len(json.dumps(envelope))
