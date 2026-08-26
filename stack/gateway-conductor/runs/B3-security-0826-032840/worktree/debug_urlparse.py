
import urllib.parse

# Debug what urlparse returns for different URL formats
test_urls = [
    "https://example.com/a?b=c",
    "https://[2606:4700::1]/"
]

for url in test_urls:
    parsed = urllib.parse.urlparse(url)
    print(f"URL: {url}")
    print(f"  hostname: '{parsed.hostname}'")
    print(f"  scheme: '{parsed.scheme}'")
    print(f"  port: {parsed.port}")
    print()
