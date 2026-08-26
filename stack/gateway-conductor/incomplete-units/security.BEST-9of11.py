
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
    
    # First identify what type of host this is - IP literal (IPv4, IPv6 or numeric)
    ip_literal = False
    
    # Check for IPv6 bracketed literals first like [2606:4700::1]
    if host.startswith('[') and host.endswith(']'):
        ip_literal = True
        try:
            # Extract the IP part (remove brackets)
            ipv6_host = host[1:-1]
            addr = ipaddress.ip_address(ipv6_host)
            
            # For IPv6, check if it's non-public 
            if addr.is_loopback or addr.is_private or addr.is_link_local                or addr.is_multicast or addr.is_unspecified or addr.is_reserved:
                raise UrlPolicyError("UNSAFE_URL/ip")
        except ValueError:
            raise UrlPolicyError("UNSAFE_URL/ip")
    
    # If not IPv6 literal, check for other IP literals
    elif _is_numeric_ip_literal(host):
        ip_literal = True
        try:
            parsed_addr = _parse_numeric_ip_literal(host)
            if parsed_addr is None:
                raise UrlPolicyError("UNSAFE_URL/ip")  # Shouldn't happen but just in case
            
            addr = parsed_addr
            if getattr(addr, "ipv4_mapped", None):     # ::ffff:10.0.0.1 -> 10.0.0.1
                addr = addr.ipv4_mapped
                
            # Check if it's a non-public (unsafe) address 
            if addr.is_loopback or addr.is_private or addr.is_link_local                or addr.is_multicast or addr.is_unspecified or addr.is_reserved:
                raise UrlPolicyError("UNSAFE_URL/ip")
        except ValueError:
            raise UrlPolicyError("UNSAFE_URL/ip")
    
    # If not an IP literal, apply hostname rules
    elif not ip_literal:  # Not IP literal and not IPv6 bracketed 
        if host == "localhost" or host.endswith(".local") or ("." not in host and len(host) > 0):
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


def is_sensitive_url(url: str) -> bool:
    """Check if a URL contains sensitive information like API keys"""
    # Parse the URL
    parsed = urllib.parse.urlparse(url)
    
    # Check for common sensitive query parameters  
    query_params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
    
    # Common sensitive parameter names (case-insensitive)
    sensitive_keys = {
        'api_key', 'secret', 'token', 'password', 'pass',
        'authorization', 'auth', 'x-amz-signature'
    }
    
    for key in query_params:
        if key.lower() in sensitive_keys:
            return True
            
    # Check for userinfo (username/password)
    if parsed.username or parsed.password:
        return True
        
    return False


def validate_redirect(source, target: str) -> URLResult:
    """Validate a redirect from source to target"""
    # Parse the target URL - handling relative paths that don't have scheme
    parsed = urllib.parse.urlparse(target)
    
    # If it's an absolute path without scheme (like "/next"), allow it and handle appropriately 
    if not parsed.scheme and target.startswith('/'):
        # This is a relative path, return basic result with source info but use the path
        return URLResult(
            scheme=source.scheme,
            host=source.host,
            port=443 if source.scheme == "https" else 80,
            path_query=target
        )
    
    # Check scheme (must be http or https)
    if parsed.scheme not in ("http", "https"):
        raise UrlPolicyError("UNSAFE_URL/scheme")
        
    # Check userinfo 
    if parsed.username or parsed.password:
        raise UrlPolicyError("UNSAFE_URL/userinfo") 
    
    # Validate host - must be the same as source (or public)
    if parsed.hostname != source.host:  # Use .host attribute instead of dict access
        # If it's not the same host, check that the target is public
        if not classify_ip(parsed.hostname):
            raise UrlPolicyError("UNSAFE_URL/host")
    
    return URLResult(
        scheme=parsed.scheme,
        host=parsed.hostname,
        port=443 if parsed.scheme == "https" else 80,
        path_query=(parsed.path + ("?" + parsed.query if parsed.query else ""))
    )
