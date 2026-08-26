"""
Envelope implementation for Halo Research Gateway.
"""

import json
from typing import List, Dict, Optional


SCHEMA_VERSION = "1.2"


def build_envelope(tool: str, provider: str, request_id: str, requested_at: str, completed_at: str,
                   items: List[Dict], requested: int, available: int, char_budget: int, cache_hit: bool=False,
                   cache_age_seconds: int=0, cache_key: str="", cursor: Optional[str]=None, warnings: Optional[List[str]]=None) -> Dict:
    """Build an envelope dict with pagination and budget constraints."""
    
    # Initialize result structure 
    result = {
        "schema_version": SCHEMA_VERSION,
        "ok": True,
        "request_id": request_id,
        "tool": tool,
        "provider": provider,
        "requested_at": requested_at,
        "completed_at": completed_at,
        "cache": {
            "hit": cache_hit,
            "age_seconds": cache_age_seconds,
            "key": cache_key
        },
        "coverage": {
            "requested": requested,
            "available": available,
            "returned_this_page": 0,
            "returned_cumulative": 0,
            "complete": True
        },
        "page": {
            "number": 1 if cursor is None else int(cursor.split('|')[0]) + 1,
            "serialized_chars": 0,
            "next_cursor": None,
            "snapshot_expires_at": None
        },
        "items": [],
        "warnings": warnings or [],
        "retry_after_seconds": None
    }
    
    # If no items, return immediately
    if not items:
        envelope_json = json.dumps(result, separators=(',', ':'))
        result["page"]["serialized_chars"] = len(envelope_json)
        return result
        
    page_items = []
    cumulative_count = 0
    
    for item in items:
        test_items = page_items + [item]
        
        # Update the temporary envelope with this item
        temp_result = result.copy()
        temp_result["items"] = test_items
        temp_result["coverage"]["returned_this_page"] = len(test_items)
        temp_result["coverage"]["returned_cumulative"] = cumulative_count + len(test_items) 
        
        # Calculate serialized length (this is the key part)
        envelope_json = json.dumps(temp_result, separators=(',', ':'))
        
        if len(envelope_json) <= char_budget:
            page_items.append(item)
            cumulative_count += 1
        else:
            break
    
    # Finalize result with actual items and counts
    result["items"] = page_items
    result["coverage"]["returned_this_page"] = len(page_items)
    result["coverage"]["returned_cumulative"] = cumulative_count
    
    # Set next cursor if there are remaining items
    if len(items) > len(page_items):
        result["page"]["next_cursor"] = f"{result['page']['number']}|{cumulative_count}"
        result["warnings"].append("RESULT_TRUNCATED")
    
    # Calculate the final serialized_chars after setting everything up
    final_envelope_json = json.dumps(result, separators=(',', ':'))
    result["page"]["serialized_chars"] = len(final_envelope_json)
    
    return result


def error_envelope(tool: str, provider: str, request_id: str, code: str, message: str,
                   partial_items: Optional[List[Dict]]=None, retry_after_seconds: Optional[int]=None) -> Dict:
    """Build an error envelope dict."""
    
    # Create the base structure
    result = {
        "schema_version": SCHEMA_VERSION,
        "ok": False,
        "request_id": request_id,
        "tool": tool,
        "provider": provider,
        "requested_at": None,
        "completed_at": None,
        "cache": {
            "hit": False,
            "age_seconds": 0,
            "key": ""
        },
        "coverage": {
            "requested": 0,
            "available": 0,
            "returned_this_page": 0,
            "returned_cumulative": 0,
            "complete": False
        },
        "page": {
            "number": 1,
            "serialized_chars": 0,
            "next_cursor": None,
            "snapshot_expires_at": None
        },
        "items": partial_items or [],
        "warnings": [],
        "retry_after_seconds": retry_after_seconds
    }
    
    # Add error info 
    result["error"] = {
        "code": code,
        "message": message
    }
    
    return result