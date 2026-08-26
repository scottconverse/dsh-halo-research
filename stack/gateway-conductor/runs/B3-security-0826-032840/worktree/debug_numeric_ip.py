
import ipaddress

# What we actually want to test is if a host represents an IP literal
# The issue is with the specific URL "http://2130706433/" - this should be 
# rejected because 2130706433 == 127.0.0.1 (which is loopback, non-public)

test_host = "2130706433"  
print(f"Testing host: {test_host}")

try:
    # This should work - Python's ipaddress can accept integers
    addr = ipaddress.ip_address(int(test_host))
    print(f"Parsed successfully as int: {addr}")
    
    # Check if it's loopback (should be True for 127.0.0.1)
    is_loopback = addr.is_loopback 
    print(f"is_loopback: {is_loopback}")
    
    # This should return False since we want to reject non-public IPs
    public = not (addr.is_loopback or addr.is_private or addr.is_link_local        or addr.is_multicast or addr.is_unspecified or addr.is_reserved)
    print(f"Is public address (should be False): {public}")
    
except Exception as e:
    print(f"Error: {e}")

print("\nTesting the string version:")
try:
    addr = ipaddress.ip_address(test_host)  # This fails in Python
    print(f"Parsed successfully: {addr}")
except Exception as e:
    print(f"Failed to parse string directly: {e}")
