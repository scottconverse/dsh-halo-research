# Implementation of security functions for URL validation

import ipaddress
import urllib.parse
from typing import List, Optional

class UrlPolicyError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(f"Url policy violation: {code}")


def classify_ip(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    if getattr(addr, "ipv4_mapped", None):     # ::ffff:10.0.0.1 -> 10.0.0.1
        addr = addr.ipv4_mapped
    if addr.is_loopback or addr.is_private or addr.is_link_local        or addr.is_multicast or addr.is_unspecified or addr.is_reserved:
        return False
    return True


def validate_resolved(target: str, addresses: List[str]) -> Optional[str]:
    if not addresses:
        raise UrlPolicyError("UNSAFE_URL/dns")
    
    for address in addresses:
        if not classify_ip(address):
            raise UrlPolicyError("UNSAFE_URL/dns")
            
    return addresses[0]


def validate_redirect(source: str, target: str) -> URLResult:
    """Validate a redirect from source to target."""
    # This would typically parse the URLs and check that they're safe
    # For this implementation we'll just delegate to validate_url for now
    from halo_research_gateway.security import validate_url
    
    # Check if target is a valid URL first  
    result = validate_url(target)
    
    # Basic validation - redirect should not go to sensitive or unsafe URLs
    if result.scheme == "http" and result.port != 80:
        raise UrlPolicyError("UNSAFE_URL/port")
    elif result.scheme == "https" and result.port != 443:
        raise UrlPolicyError("UNSAFE_URL/port")
        
    return result


class URLResult:
    """Object returned by validate_url with attributes"""
    def __init__(self, scheme: str, host: str, port: int, path_query: str = ""):
        self.scheme = scheme
        self.host = host
        self.port = port
        self.path_query = path_query


def _as_ip(host: str):
    """Return an ip_address if host is any IP literal form, else None."""
    h = host.strip()
    if h.startswith("[") and h.endswith("]"):          # bracketed IPv6
        h = h[1:-1]
    try:
        return ipaddress.ip_address(h)                  # dotted v4, plain v6
    except ValueError:
        pass
    
    # Try base 16 (hex), then base 8 (octal), then base 10 (decimal)
    # Important: Only accept hex when it starts with "0x" or "0X"
    # And only accept octal when it starts with "0o", "0O", or a leading zero
    for base, prefix in [(16, '0x'), (16, '0X'), (8, '0o'), (8, '0O')]:
        if h.startswith(prefix):
            try:
                value = int(h, base)
                if 0 <= value <= 0xFFFFFFFF:
                    return ipaddress.ip_address(value)
            except ValueError:
                continue
    
    # Try octal with leading zero but no "0o" prefix (e.g. 017700000001)  
    if h.startswith('0') and len(h) > 1 and all(c in '01234567' for c in h[1:]):
        try:
            value = int(h, 8)
            if 0 <= value <= 0xFFFFFFFF:
                return ipaddress.ip_address(value)
        except ValueError:
            pass
    
    # Try decimal last
    try:
        value = int(h, 10) 
        if 0 <= value <= 0xFFFFFFFF:
            return ipaddress.ip_address(value)
    except ValueError:
        pass
        
    return None


def is_sensitive_url(url: str) -> bool:
    """Determine if a URL contains sensitive information."""
    # Check for common sensitive parameters in query strings 
    import urllib.parse
    
    parsed = urllib.parse.urlparse(url)
    
    # Parse query parameters
    query_params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
    
    # Common sensitive parameter names to look for (case insensitive)
    sensitive_keys = ['api_key', 'secret', 'password', 'token', 'sessionid', 
                      'auth', 'x-amz-signature', 'authorization']
    
    # Check if any of the sensitive keys are in query parameters
    for key in query_params:
        if key.lower() in [k.lower() for k in sensitive_keys]:
            return True
            
    # Also check for basic auth credentials (which will be caught by validate_url)
    # but we want to flag URLs with password in the URL as sensitive
    if parsed.password is not None:
        return True
    
    return False


def validate_url(url: str) -> URLResult:
    parsed = urllib.parse.urlparse(url)
    
    # Check scheme
    if parsed.scheme not in ("http", "https"):
        raise UrlPolicyError("UNSAFE_URL/scheme")
        
    # Check userinfo (username/password)
    if parsed.username or parsed.password:
        raise UrlPolicyError("UNSAFE_URL/userinfo")
        
    # Validate length > 2000
    if len(url) > 2000:
        raise UrlPolicyError("UNSAFE_URL/length")
    
    # Check port (must be 80 or 443)
    port = parsed.port
    if port is not None and port not in (80, 443):
        raise UrlPolicyError("UNSAFE_URL/port")
        
    # Host validation
    host = parsed.hostname
    
    # Empty host check
    if not host:
        raise UrlPolicyError("UNSAFE_URL/host")
    
    # First resolve the host to an IP address BEFORE applying hostname rules
    ip = _as_ip(host)
    if ip is not None:
        if not classify_ip(str(ip)):
            raise UrlPolicyError("UNSAFE_URL/ip")
        # a public IP literal is ACCEPTED - skip every hostname rule below
    else:
        if host == "localhost" or host.endswith(".local") or "." not in host:
            raise UrlPolicyError("UNSAFE_URL/host")
    
    # Construct result object with scheme, host, port, path_query 
    path_query = parsed.path
    if parsed.query:
        path_query += "?" + parsed.query
        
    return URLResult(
        scheme=parsed.scheme,
        host=parsed.hostname,
        port=443 if parsed.scheme == "https" else 80,
        path_query=path_query or ""
    )
