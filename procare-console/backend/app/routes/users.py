from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.auth import get_current_user, supabase_admin_client

router = APIRouter(prefix="/users", tags=["users"])

def normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    digits = "".join([c for c in phone if c.isdigit()])
    if len(digits) >= 10:
        return digits[-10:]
    return digits

@router.get("")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    current_user: dict = Depends(get_current_user)
):
    offset = (page - 1) * limit
    
    query = supabase_admin_client.table("users").select("*", count="exact")
    
    if search:
        query = query.or_(f"user_name.ilike.%{search}%,mobile_number.ilike.%{search}%")
        
    query = query.order("created_at", desc=True)
    query = query.range(offset, offset + limit - 1)
    
    res = query.execute()
    
    return {
        "users": res.data or [],
        "total": res.count or 0,
        "page": page,
        "limit": limit
    }

@router.get("/{id}")
async def get_user_detail(id: str, current_user: dict = Depends(get_current_user)):
    res = supabase_admin_client.table("users").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = res.data[0]
    
    # Retrieve related sessions from chatbot_logs based on mobile number or name
    sessions = []
    mobile = user.get("mobile_number")
    name = user.get("user_name")
    
    if mobile or name:
        # Fetch recent logs from database. We can select logs (limited to 1000)
        logs_res = supabase_admin_client.table("chatbot_logs") \
            .select("session_id,channel,created_at,user_name,user_mobile_number") \
            .order("created_at", desc=True) \
            .limit(1000) \
            .execute()
            
        seen_sessions = {}
        norm_user_mobile = normalize_phone(mobile) if mobile else ""
        
        for log in (logs_res.data or []):
            sid = log["session_id"]
            if not sid:
                continue
                
            log_mobile = log.get("user_mobile_number")
            norm_log_mobile = normalize_phone(log_mobile) if log_mobile else ""
            log_name = log.get("user_name")
            
            # Check logical relationship:
            # 1. Match normalized mobile numbers (if both exist)
            # 2. Match names (case-insensitive, as a secondary fallback)
            matches_mobile = norm_user_mobile and (norm_user_mobile == norm_log_mobile)
            matches_name = name and log_name and (name.strip().lower() == log_name.strip().lower())
            
            if matches_mobile or matches_name:
                if sid not in seen_sessions:
                    seen_sessions[sid] = {
                        "session_id": sid,
                        "channel": log["channel"],
                        "latest_message_timestamp": log["created_at"]
                    }
        sessions = list(seen_sessions.values())
        
    return {
        "user": user,
        "sessions": sessions
    }
