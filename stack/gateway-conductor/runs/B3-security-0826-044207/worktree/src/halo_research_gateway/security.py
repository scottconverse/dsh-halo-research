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


class URLResult:
    """Object returned by validate_url with attributes"""
    def __init__(self, scheme: str, host: str, port: int, path_query: str = ""):
        self.scheme = scheme
        self.host = host
        self.port = port
        self.path_query = path_query


def _is_numeric_ip_literal(host: str) -> bool:
    """Check if host is a numeric IP literal (decimal/hex/octal)"""
    try:
        # Check for decimal integer form - this should be the case for numeric strings like "2130706433"
        if host.isdigit():
            int(host)
            return True
        elif host.startswith('0x') and all(c in '0123456789abcdefABCDEF' for c in host[2:]):
            int(host, 16)
            return True
        elif host.startswith('0') and all(c in '0123456789' for c in host[1:]) and len(host) > 1:
            int(host, 8)
            return True
    except ValueError:
        pass
    return False


def _parse_numeric_ip_literal(host: str) -> Optional[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """Parse numeric IP literal format"""
    try:
        if host.isdigit():
            return ipaddress.ip_address(int(host))
        elif host.startswith('0x'):
            return ipaddress.ip_address(int(host, 16))
        elif host.startswith('0') and len(host) > 1:
            return ipaddress.ip_address(int(host, 8))
    except ValueError:
        pass
    return None


def _as_ip(host: str):
    """Return an ip_address if host is any IP literal form, else None."""
    h = host.strip()
    if h.startswith("[") and h.endswith("]"):          # bracketed IPv6
        h = h[1:-1]
    try:
        return ipaddress.ip_address(h)                  # dotted v4, plain v6
    except ValueError:
        pass
    for base in (16, 8, 10):                            # 0x7f000001, 017700000001, 2130706433
        try:
            if base == 16 and not h.startswith(("0x", "0X")):
                continue  # Only parse as hex if it has 0x prefix
            elif base == 8 and not (h.startswith(("0o", "0O")) or (h.startswith("0") and len(h) > 1)):
                continue  # Only parse as octal if it has 0o/0O prefix or leading zero with more digits
            value = int(h, base)
        except ValueError:
            continue
        if 0 <= value <= 0xFFFFFFFF:
            return ipaddress.ip_address(value)
    return None


def validate_url(url: str) -> URLResult:

def _as_ip(host: str):
    """Return an ip_address if host is any IP literal form, else None."""
    h = host.strip()
    if h.startswith("[") and h.endswith("]"):          # bracketed IPv6
        h = h[1:-1]
    try:
        return ipaddress.ip_address(h)                  # dotted v4, plain v6
    except ValueError:
        pass
    for base in (16, 8, 10):                            # 0x7f000001, 017700000001, 2130706433
        try:
            if base == 16 and not h.startswith(("0x", "0X")):
                continue  # Only parse as hex if it has 0x prefix
            elif base == 8 and not (h.startswith(("0o", "0O")) or (h.startswith("0") and len(h) > 1)):
                continue  # Only parse as octal if it has 0o/0O prefix or leading zero with more digits
            value = int(h, base)
        except ValueError:
            continue
        if 0 <= value <= 0xFFFFFFFF:
            return ipaddress.ip_address(value)
    return None



def _as_ip(host: str):
    """Return an ip_address if host is any IP literal form, else None."""
    h = host.strip()
    if h.startswith("[") and h.endswith("]"):          # bracketed IPv6
        h = h[1:-1]
    try:
        return ipaddress.ip_address(h)                  # dotted v4, plain v6
    except ValueError:
        pass
    for base in (16, 8, 10):                            # 0x7f000001, 017700000001, 2130706433
        try:
            if base == 16 and not h.startswith(("0x", "0X")):
                continue  # Only parse as hex if it has 0x prefix
            elif base == 8 and not (h.startswith(("0o", "0O")) or (h.startswith("0") and len(h) > 1)):
                continue  # Only parse as octal if it has 0o/0O prefix or leading zero with more digits
            value = int(h, base)
        except ValueError:
            continue
        if 0 <= value <= 0xFFFFFFFF:
            return ipaddress.ip_address(value)
    return None


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
    
    # First resolve the host to an IP address if it's any form of IP literal 
    ip = _as_ip(host)
    if ip is not None:
        if not classify_ip(str(ip)):
            raise UrlPolicyError("UNSAFE_URL/ip")
        # a public IP literal is ACCEPTED - skip every hostname rule below
    else:
        # Now apply hostname rules (only reached when host is NOT an IP literal)
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