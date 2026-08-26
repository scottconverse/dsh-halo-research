
import sys
sys.path.insert(0, '.')

# Test imports work correctly
try:
    from src.halo_research_gateway.security import _as_ip, validate_url, UrlPolicyError
    print("✓ Imports successful")
except Exception as e:
    print(f"✗ Import failed: {e}")
    exit(1)

# Test 1: IPv6 literal should be accepted
try:
    result = validate_url('https://[2606:4700::1]/')
    print("✓ Public IPv6 literal accepted")
except UrlPolicyError as e:
    if "UNSAFE_URL/host" in str(e):
        print("✗ Still failing with UNSAFE_URL/host for public IPv6")
    else:
        print(f"✗ Different error for IPv6: {e}")
except Exception as e:
    print(f"✗ Unexpected error for IPv6: {e}")

# Test 2: Decimal IP should be rejected
try:
    validate_url('http://2130706433/')
    print("✗ Decimal IP was incorrectly accepted")
except UrlPolicyError as e:
    if "UNSAFE_URL/ip" in str(e):
        print("✓ Decimal IP correctly rejected")
    else:
        print(f"✗ Wrong error for decimal: {e}")
except Exception as e:
    print(f"✗ Unexpected error for decimal: {e}")

# Test 3: Hex IP should be rejected  
try:
    validate_url('http://0x7f000001/')
    print("✗ Hex IP was incorrectly accepted")
except UrlPolicyError as e:
    if "UNSAFE_URL/ip" in str(e):
        print("✓ Hex IP correctly rejected")
    else:
        print(f"✗ Wrong error for hex: {e}")
except Exception as e:
    print(f"✗ Unexpected error for hex: {e}")

# Test 4: Octal IP should be rejected
try:
    validate_url('http://017700000001/')
    print("✗ Octal IP was incorrectly accepted")
except UrlPolicyError as e:
    if "UNSAFE_URL/ip" in str(e):
        print("✓ Octal IP correctly rejected")
    else:
        print(f"✗ Wrong error for octal: {e}")
except Exception as e:
    print(f"✗ Unexpected error for octal: {e}")

# Test 5: Check _as_ip function directly
print("\nTesting _as_ip function:")
test_cases = [
    '[2606:4700::1]',
    '2130706433', 
    '0x7f000001',
    '017700000001'
]

for case in test_cases:
    try:
        result = _as_ip(case)
        print(f"  _as_ip('{case}') = {result}")
    except Exception as e:
        print(f"  _as_ip('{case}') failed: {e}")

print("Test completed")
