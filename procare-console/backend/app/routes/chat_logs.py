from fastapi import APIRouter, Depends, Query, HTTPException
from app.auth import get_current_user, supabase_admin_client

router = APIRouter(prefix="/chat-logs", tags=["chat-logs"])

def normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    digits = "".join([c for c in phone if c.isdigit()])
    if len(digits) >= 10:
        return digits[-10:]
    return digits

@router.get("")
async def list_chat_sessions(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    channel: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    current_user: dict = Depends(get_current_user)
):
    # Fetch recent logs from database to aggregate in Python
    query = supabase_admin_client.table("chatbot_logs").select("*")
    
    # Apply direct filters in database query to minimize payload sizes
    if channel:
        query = query.eq("channel", channel)
    if start_date:
        query = query.gte("created_at", start_date)
    if end_date:
        query = query.lte("created_at", end_date)
        
    query = query.order("created_at", desc=True)
    query = query.limit(1000) # Fetch up to 1000 recent messages for dashboard group mapping
    
    res = query.execute()
    logs = res.data or []
    
    # 1. Filter by search to find matching session IDs
    matching_session_ids = set()
    if search:
        search_lower = search.lower()
        search_norm = normalize_phone(search)
        
        for log in logs:
            sid = log.get("session_id")
            if not sid:
                continue
                
            session_id_str = (log.get("session_id") or "").lower()
            name = (log.get("user_name") or "").lower()
            mobile = log.get("user_mobile_number") or ""
            mobile_lower = mobile.lower()
            norm_log_mobile = normalize_phone(mobile) if mobile else ""
            user_input = (log.get("user_input") or "").lower()
            ai_response = (log.get("ai_response") or "").lower()
            
            phone_matched = False
            if search_norm and norm_log_mobile and (search_norm == norm_log_mobile):
                phone_matched = True
                
            if (search_lower in session_id_str or
                search_lower in name or
                search_lower in mobile_lower or
                phone_matched or
                search_lower in user_input or
                search_lower in ai_response):
                matching_session_ids.add(sid)
                
    # Group sessions in Python memory
    grouped = {}
    for log in logs:
        sid = log.get("session_id")
        if not sid:
            continue
            
        # If search is active, only include logs for sessions that had at least one match
        if search and sid not in matching_session_ids:
            continue
            
        if sid not in grouped:
            grouped[sid] = {
                "session_id": sid,
                "user_name": log.get("user_name") or "Anonymous Patient",
                "user_mobile_number": log.get("user_mobile_number") or "N/A",
                "channel": log.get("channel") or "website",
                "message_count": 0,
                "latest_message_timestamp": log.get("created_at"),
                "total_response_time": 0
            }
            
        group = grouped[sid]
        group["message_count"] += 1
        group["total_response_time"] += log.get("response_time_ms") or 0
        
        # Track latest non-null identity tags
        if log.get("created_at") > group["latest_message_timestamp"]:
            group["latest_message_timestamp"] = log.get("created_at")
            if log.get("user_name"):
                group["user_name"] = log.get("user_name")
            if log.get("user_mobile_number"):
                group["user_mobile_number"] = log.get("user_mobile_number")
                
    # Calculate response average
    session_list = []
    for sid, group in grouped.items():
        count = group["message_count"]
        group["average_response_time"] = int(group["total_response_time"] / count) if count > 0 else 0
        del group["total_response_time"]
        session_list.append(group)
        
    # Sort latest sessions first
    session_list.sort(key=lambda x: x["latest_message_timestamp"], reverse=True)
    
    # Apply pagination offset limits
    total = len(session_list)
    offset = (page - 1) * limit
    paginated_sessions = session_list[offset : offset + limit]
    
    return {
        "sessions": paginated_sessions,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/{session_id}")
async def get_session_detail(session_id: str, current_user: dict = Depends(get_current_user)):
    res = supabase_admin_client.table("chatbot_logs") \
        .select("*") \
        .eq("session_id", session_id) \
        .order("created_at", desc=False) \
        .execute()
        
    if not res.data:
        raise HTTPException(status_code=404, detail="Conversation session not found")
        
    return {
        "session_id": session_id,
        "messages": res.data
    }
