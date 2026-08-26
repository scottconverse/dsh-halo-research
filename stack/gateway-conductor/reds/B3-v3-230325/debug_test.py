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
        if e.code == "UNSAFE_URL/host":
            print("✓ Single-label hostname correctly rejected")
        else:
            print(f"✗ Wrong error code for single label: {e.code}")
    
    # Test case: localhost rejection
    try:
        result = validate_url("http://localhost/")
        print(f"ERROR: localhost should have been rejected but got {result}")  
    except UrlPolicyError as e:
        if e.code == "UNSAFE_URL/host":
            print("✓ Localhost correctly rejected")
        else:
            print(f"✗ Wrong error code for localhost: {e.code}")
            
    # Test case: .local rejection
    try:
        result = validate_url("http://foo.local/") 
        print(f"ERROR: foo.local should have been rejected but got {result}")
    except UrlPolicyError as e:
        if e.code == "UNSAFE_URL/host":
            print("✓ .local correctly rejected")
        else:
            print(f"✗ Wrong error code for .local: {e.code}")
    
    # Test IPv4 case that should be rejected
    try:
        result = validate_url("http://127.0.0.1/")
        print(f"ERROR: 127.0.0.1 should have been rejected but got {result}")  
    except UrlPolicyError as e:
        if e.code == "UNSAFE_URL/ip":
            print("✓ Private IPv4 correctly rejected")
        else:
            print(f"✗ Wrong error code for private IP: {e.code}")
            
    # Test IPv6 case that should be rejected
    try:
        result = validate_url("http://[::1]/")
        print(f"ERROR: [::1] should have been rejected but got {result}")  
    except UrlPolicyError as e:
        if e.code == "UNSAFE_URL/ip":
            print("✓ Private IPv6 correctly rejected") 
        else:
            print(f"✗ Wrong error code for private IPv6: {e.code}")
    
    # Test public IP (should work)
    try:
        result = validate_url("http://93.184.216.34/")
        print(f"✓ Public IP accepted successfully")
    except Exception as e:
        print(f"✗ Public IP was incorrectly rejected: {e}")
        
    # Test classify_ip function
    print(f"classify_ip('2606:4700::1') (public IPv6): {classify_ip('2606:4700::1')}")  
    print(f"classify_ip('127.0.0.1') (private IPv4): {classify_ip('127.0.0.1')}")
    
    # Test decimal IP handling
    try:
        result = validate_url("http://2130706433/")  # Should be 127.0.0.1 
        print(f"ERROR: 2130706433 should have been rejected but got {result}")
    except UrlPolicyError as e:
        if e.code == "UNSAFE_URL/ip":
            print("✓ Decimal IP correctly rejected")
        else:
            print(f"✗ Wrong error code for decimal IP: {e.code}")

    print("\n=== All tests completed ===")
    
except Exception as e:
    print(f"Error in test script: {e}")
    import traceback
    traceback.print_exc()
