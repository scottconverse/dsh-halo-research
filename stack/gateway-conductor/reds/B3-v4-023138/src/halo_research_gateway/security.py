import ipaddress
from urllib.parse import urlparse

class UrlPolicyError(Exception):
    def __init__(self, code, message=""):
        self.code = code
        self.message = message
        super().__init__(message)

def validate_url(url):
    """Parse URL and return object with scheme, host, port, path_query."""
    parsed = urlparse(url)
    
    # Check for valid schemes
    if not parsed.scheme or parsed.scheme not in ('http', 'https', 'ftp'):
        raise UrlPolicyError("INVALID_URL/scheme")
        
    # Validate hostname 
    if parsed.hostname:
        # Single-label hostnames (no dots) must be rejected except localhost and *.local
        if '.' not in parsed.hostname and parsed.hostname != 'localhost' and not parsed.hostname.endswith('.local'):
            raise UrlPolicyError("UNSAFE_URL/host")
            
        # localhost and *.local domains must be rejected  
        if parsed.hostname == 'localhost' or parsed.hostname.endswith('.local'):
            raise UrlPolicyError("UNSAFE_URL/host")
        
        # Check for IP addresses
        try:
            ip = ipaddress.ip_address(parsed.hostname)
            # IPv4/IPv6 loopback, private, etc. must be rejected - check with classify_ip 
            if not classify_ip(str(ip)):
                raise UrlPolicyError("UNSAFE_URL/ip")
        except ValueError:
            # Not an IP address - continue with hostname validation
            pass
    
    # Determine port for result object: fill in default ports when no explicit port provided
    port = parsed.port  # Keep original URL port if specified, or None if not 
    if port is None:
        # Fill in default port only for the Result object display (not stored)  
        if parsed.scheme == 'http':
            port = 80
        elif parsed.scheme == 'https':
            port = 443
        elif parsed.scheme == 'ftp':
            port = 21
    
    # Create result object with required attributes 
    class Result:
        def __init__(self):
            self.scheme = parsed.scheme
            self.host = parsed.hostname or ''
            self.port = port
            self.path_query = parsed.path + ('?' + parsed.query if parsed.query else '')
    
    return Result()

def classify_ip(ip_string):
    """Classify IP address as public or not."""
    try:
        ip_obj = ipaddress.ip_address(ip_string)
        
        # For IPv6 addresses, check for ipv4-mapped addresses first
        if isinstance(ip_obj, ipaddress.IPv6Address) and ip_obj.ipv4_mapped:
            ip_obj = ip_obj.ipv4_mapped
        
        # Check if it's a special or non-public address 
        if (ip_obj.is_loopback or 
            ip_obj.is_private or 
            ip_obj.is_link_local or 
            ip_obj.is_multicast or 
            ip_obj.is_unspecified or 
            ip_obj.is_reserved):
            return False
        
        # IPv6 unique-local addresses (fc00::/7)  
        if isinstance(ip_obj, ipaddress.IPv6Address):
            try:
                # Check if it's in the unique-local range
                ipv6_int = int(ip_obj)
                if (ipv6_int & 0xff000000000000000000000000000000) == 0xfc000000000000000000000000000000:
                    return False
            except Exception:
                pass
                
    except Exception:
        return False
    
    # If it passes all the above checks, consider it public 
    return True

def validate_resolved(target, addresses):
    """Validate resolved DNS addresses."""
    # Empty list should raise error
    if not addresses:
        raise UrlPolicyError("UNSAFE_URL/dns")
        
    # Check each address - all must be public 
    for addr in addresses:
        if not classify_ip(addr):
            raise UrlPolicyError("UNSAFE_URL/dns")
            
    # Return first public address  
    return addresses[0]