import pytest
from unittest.mock import patch, MagicMock

from halo_research_gateway.security import (
    UrlPolicyError,
    validate_url,
    classify_ip,
    validate_resolved,
)


def test_validate_url_scheme():
    # Test that valid schemes work
    result = validate_url("http://example.com")
    assert result.scheme == "http"
    assert result.host == "example.com"
    assert result.port is None

    result = validate_url("https://example.com:443")
    assert result.scheme == "https"
    assert result.host == "example.com"
    assert result.port == 443


def test_validate_url_host():
    # Test that hostnames are parsed correctly
    result = validate_url("http://example.com/path")
    assert result.host == "example.com"

    result = validate_url("http://192.168.1.1:8080")
    assert result.host == "192.168.1.1"
    assert result.port == 8080

    # Test localhost
    with pytest.raises(UrlPolicyError) as exc:
        validate_url("http://localhost/path")
    assert exc.value.code == "UNSAFE_URL/host"

    # Test single-label hostname
    with pytest.raises(UrlPolicyError) as exc:
        validate_url("http://intranet/")
    assert exc.value.code == "UNSAFE_URL/host"

    # Test .local domains
    with pytest.raises(UrlPolicyError) as exc:
        validate_url("http://device.local/path")
    assert exc.value.code == "UNSAFE_URL/host"


def test_validate_url_ip():
    # Test valid IP addresses work
    result = validate_url("http://192.168.1.1:8080")
    assert result.host == "192.168.1.1"
    
    # Test invalid IPs (private, loopback)
    with pytest.raises(UrlPolicyError) as exc:
        validate_url("http://10.0.0.1/path")  # private
    assert exc.value.code == "UNSAFE_URL/ip"

    with pytest.raises(UrlPolicyError) as exc:
        validate_url("http://127.0.0.1/path")  # loopback
    assert exc.value.code == "UNSAFE_URL/ip"

    with pytest.raises(UrlPolicyError) as exc:
        validate_url("http://[::1]/path")  # IPv6 loopback
    assert exc.value.code == "UNSAFE_URL/ip"


def test_classify_ip():
    # Test classify_ip function - should return False for non-public IPs
    
    # Loopback addresses
    assert not classify_ip("127.0.0.1")
    assert not classify_ip("::1")
    
    # Private IP ranges
    assert not classify_ip("192.168.1.1")
    assert not classify_ip("10.0.0.1")
    assert not classify_ip("172.16.0.1")
    
    # Public IPs should work
    assert classify_ip("8.8.8.8")
    assert classify_ip("2001:4860:4860::8888")


def test_validate_resolved():
    # Test that validate_resolved returns first public address when valid
    result = validate_resolved("example.com", ["8.8.8.8"])
    assert result == "8.8.8.8"
    
    # Test empty addresses list raises error
    with pytest.raises(UrlPolicyError) as exc:
        validate_resolved("example.com", [])
    assert exc.value.code == "UNSAFE_URL/dns"

    # Test non-public address raises error
    with pytest.raises(UrlPolicyError) as exc:
        validate_resolved("example.com", ["10.0.0.1"])
    assert exc.value.code == "UNSAFE_URL/dns"
    
    # Test multiple addresses - should return first public one
    result = validate_resolved("example.com", ["10.0.0.1", "8.8.8.8"])
    assert result == "8.8.8.8"


def test_url_with_default_ports():
    # Test that default ports are filled in correctly
    
    result = validate_url("http://example.com")
    assert result.port == 80
    
    result = validate_url("https://example.com")
    assert result.port == 443

    result = validate_url("ftp://example.com")
    assert result.port == 21
