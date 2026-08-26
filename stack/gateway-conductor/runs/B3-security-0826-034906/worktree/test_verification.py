
import sys
sys.path.insert(0, '.')

# Test imports work correctly
try:
    from src.halo_research_gateway.security import _as_ip, validate_url, UrlPolicyError
    print("✓ Imports successful")
except Exception as e:
    print(f"✗ Import failed: {e}")
    exit(1)

print("\nTesting _as_ip function directly:")
# Test the specific cases mentioned in AGENTS.md
test_cases = [
    ('[2606:4700::1]', 'Should be IPv6 literal'),
    ('2130706433', 'Should be decimal IP (loopback)'),
    ('0x7f000001', 'Should be hex IP (loopback)'),  
    ('017700000001', 'Should be octal IP (loopback)'),
    ('localhost', 'Should not be IP literal')
]

for case, description in test_cases:
    try:
        result = _as_ip(case)
        print(f"  _as_ip('{case}') = {result} ({description})")
    except Exception as e:
        print(f"  _as_ip('{case}') failed: {e}")

print("\nTesting validate_url function:")
# Test cases from AGENTS.md
test_urls = [
    ('https://[2606:4700::1]/', 'Should accept public IPv6'),
    ('http://2130706433/', 'Should reject decimal IP'),  
    ('http://0x7f000001/', 'Should reject hex IP'),
    ('http://017700000001/', 'Should reject octal IP'),
]

for url, description in test_urls:
    try:
        result = validate_url(url)
        print(f"  {url} -> ACCEPTED ({description})")
    except UrlPolicyError as e:
        if "UNSAFE_URL/ip" in str(e) or "UNSAFE_URL/host" in str(e):
            print(f"  {url} -> REJECTED with {e.code} ({description})")
        else:
            print(f"  {url} -> ERROR: {e}")
    except Exception as e:
        print(f"  {url} -> UNEXPECTED ERROR: {e}")

print("\nTest completed")
