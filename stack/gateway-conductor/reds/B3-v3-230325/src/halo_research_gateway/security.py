from dataclasses import dataclass
from ipaddress import ip_address, IPv4Address, IPv6Address
import re
import urllib.parse

# Error codes for different validation failures
UNSAFE_URL = "unsafe_url"
SCHEME = f"{UNSAFE_URL}/scheme"
USERINFO = f"{UNSAFE_URL}/userinfo"
PORT = f"{UNSAFE_URL}/port"
LENGTH = f"{UNSAFE_URL}/length"
HOST = f"{UNSAFE_URL}/host"
IP = f"{UNSAFE_URL}/ip"
DNS = f"{UNSAFE_URL}/dns"

@dataclass
class ParsedTarget:
    scheme: str
    host: str
    port: int | None
    path_query: str

class UrlPolicyError(Exception):
    def __init__(self, code: str, message: str = ""):
        self.code = code
        super().__init__(message)

def validate_url(url: str) -> ParsedTarget:
    if len(url) > 2000:
        raise UrlPolicyError(LENGTH, "URL exceeds maximum length of 2000 characters")
    
    parsed = urllib.parse.urlparse(url)
    
    # Only allow http/https schemes
    if parsed.scheme not in ('http', 'https'):
        raise UrlPolicyError(SCHEME, f"Invalid scheme: {parsed.scheme}")
        
    # Reject userinfo (username/password) in URLs
    if parsed.username or parsed.password:
        raise UrlPolicyError(USERINFO, "URL contains userinfo")
    
    # Set default ports 
    port = parsed.port
    if port is None:
        if parsed.scheme == 'http':
            port = 80
        elif parsed.scheme == 'https':
            port = 443
    
    # Missing host check 
    if not parsed.hostname:
        raise UrlPolicyError(HOST, "URL missing hostname")
    
    # Reject localhost and .local domains  
    if parsed.hostname == 'localhost' or parsed.hostname.endswith('.local'):
        raise UrlPolicyError(HOST, f"Invalid hostname: {parsed.hostname}")
        
    # Check for single-label hostnames (no dots) - these must be rejected
    if '.' not in parsed.hostname:
        raise UrlPolicyError(HOST, "Single-label hostname not allowed")
    
    is_ip_literal = False 
    try:
        # Handle IPv6 addresses with brackets
        if parsed.hostname.startswith('[') and parsed.hostname.endswith(']'):
            ip_str = parsed.hostname[1:-1]
            addr = ip_address(ip_str)
            # Check for non-public IPs using the classify function
            if not classify_ip(addr):
                raise UrlPolicyError(IP, f"Invalid IP address: {ip_str}")
            is_ip_literal = True
            
        elif parsed.hostname.startswith('0x') or (parsed.hostname.startswith('0') and len(parsed.hostname) > 1 and all(c in '0123456789abcdefABCDEF' for c in parsed.hostname[1:])):
            # Handle hex/decimal IP encodings
            try:
                if parsed.hostname.startswith('0x'):
                    val = int(parsed.hostname, 16)
                else:
                    val = int(parsed.hostname)
                    
                # Convert back to dotted decimal format and validate  
                if val <= 0xffffffff:  # Valid IPv4 range 
                    ip_str = str(ip_address(val))
                    addr = ip_address(ip_str)
                    if not classify_ip(addr):
                        raise UrlPolicyError(IP, f"Invalid IP address: {parsed.hostname}")
                    is_ip_literal = True
            except ValueError:
                pass
            
        else:
            # Regular IPv4 or hostname validation  
            try:
                addr = ip_address(parsed.hostname)
                # Check for non-public IPs using the classify function
                if not classify_ip(addr):
                    raise UrlPolicyError(IP, f"Invalid IP address: {parsed.hostname}")
                is_ip_literal = True
            except ValueError:
                pass  # Non-IP hostname case
                
    except ValueError:
        raise UrlPolicyError(HOST, "Invalid host format")
    
    return ParsedTarget(
        scheme=parsed.scheme,
        host=parsed.hostname,
        port=port,
        path_query=urllib.parse.urlunparse(('', '', parsed.path, parsed.params, parsed.query, parsed.fragment))
    )

def classify_ip(ip) -> bool:
    """Classify IP addresses as public or not. Only allow public IPs."""
    try:
        # Handle IPv6-mapped IPv4 addresses properly
        addr = ip_address(ip)
        
        # If it's an IPv6 address that maps to IPv4, unwrap it for classification  
        if isinstance(addr, IPv6Address) and addr.ipv4_mapped:
            addr = addr.ipv4_mapped
            
        # Check if the IP is public (not loopback, private, etc.)
        if isinstance(addr, IPv4Address):
            return (
                not addr.is_loopback and 
                not addr.is_private and 
                not addr.is_link_local and 
                not addr.is_multicast and 
                not addr.is_unspecified and 
                not addr.is_reserved
            )
        elif isinstance(addr, IPv6Address):
            # For IPv6 addresses, only check a few key properties for public status,
            # since is_unique_local might not exist in some Python versions
            return (
                not addr.is_loopback and 
                not addr.is_private and 
                not addr.is_link_local and 
                not addr.is_multicast and 
                not addr.is_unspecified and 
                not addr.is_reserved and
                not (addr.suffixlen == 128 and addr.network_address == IPv6Address('fc00::'))  # fc00::/7 range check
            )
    except ValueError:
        return False

def validate_resolved(target: ParsedTarget, addresses) -> str:
    """Validate resolved IP addresses"""
    if not addresses:
        raise UrlPolicyError(DNS, "No DNS resolution")
        
    for addr in addresses:
        # Check if address is public
        if classify_ip(addr):
            return str(addr)
    
    raise UrlPolicyError(DNS, "All resolved addresses are non-public")

def validate_redirect(current: ParsedTarget, location: str) -> ParsedTarget:
    """Validate redirect URL by resolving relative paths"""
    # Parse the current URL for base
    base_url = f"{current.scheme}://{current.host}"
    if current.port is not None and current.port not in (80, 443):
        base_url += f":{current.port}"
    
    # Resolve the redirect location against the current URL
    absolute_url = urllib.parse.urljoin(base_url, location)
    
    return validate_url(absolute_url)

def is_sensitive_url(url: str) -> bool:
    """Check if URL contains sensitive parameters"""
    parsed = urllib.parse.urlparse(url)
    
    # Check for userinfo in URL
    if parsed.username or parsed.password:
        return True
        
    # Check query parameters for sensitive names (case-insensitive)
    query_params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
    
    sensitive_names = [
        'token', 'key', 'secret', 'signature', 'sig', 
        'credential', 'auth', 'code', 'session', 'jwt'
    ]
    
    for param_name in query_params:
        if any(sens.lower() in param_name.lower() for sens in sensitive_names):
            return True
    
    return False
