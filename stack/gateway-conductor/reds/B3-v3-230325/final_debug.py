import sys
sys.path.insert(0, '.')

# Test our implementation directly 
try:
    from src.halo_research_gateway.security import validate_url, classify_ip, UrlPolicyError
    
    print("=== Testing specific failing cases ===")
    
    # Test case: single label hostname rejection  
    try:
        result = validate_url("http://intranet/")
        print(f"ERROR: intranet should have been rejected but got {result}")
    except UrlPolicyError as e:
        print(f"Single-label error code: '{e.code}'")
    
    # Test IPv6 case that should be rejected
    try:
        result = validate_url("http://[::1]/")
        print(f"ERROR: [::1] should have been rejected but got {result}")  
    except UrlPolicyError as e:
        print(f"IPv6 error code: '{e.code}'")
        
    # Test classify_ip function for IPv6
    try:
        result = classify_ip('2001:db8::1')
        print(f"classify_ip('2001:db8::1'): {result}")
    except Exception as e:
        print(f"Error in classify_ip for public IPv6: {e}")
        
    # Test classify_ip function for private IPv6 
    try:
        result = classify_ip('::1')  # localhost
        print(f"classify_ip('::1'): {result}")
    except Exception as e:
        print(f"Error in classify_ip for private IPv6: {e}")

    print("\n=== All tests completed ===")
    
except Exception as e:
    print(f"Error in test script: {e}")
    import traceback
    traceback.print_exc()
