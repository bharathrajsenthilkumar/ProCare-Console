import uuid
import datetime
from typing import Optional, Dict, Any
from supabase import create_client, Client
from cli.config import SUPABASE_URL, SUPABASE_KEY

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """Initialize and return a singleton Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client

def insert_query(
    prompt: str,
    selected_model: str,
    session_id: Optional[str] = None,
    user_name: str = "Console CLI User",
    channel: str = "console_cli",
    ai_response: str = "[Pending AI Processing]",
    response_time_ms: int = 0
) -> Dict[str, Any]:
    """
    Inserts the new message/query directly into the Supabase database table.
    
    The payload dictionary securely includes the selected model
    ('requested_model': selected_model) alongside the prompt text ('user_input': prompt).
    """
    client = get_supabase_client()
    
    current_session_id = session_id or str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # Payload dictionary strictly including requested_model alongside prompt text
    payload: Dict[str, Any] = {
        "session_id": current_session_id,
        "user_input": prompt,
        "requested_model": selected_model,
        "ai_response": ai_response,
        "response_time_ms": response_time_ms,
        "channel": channel,
        "user_name": user_name,
        "created_at": now_iso
    }
    
    try:
        # Direct write to Supabase table
        response = client.table("chatbot_logs").insert(payload).execute()
        data = response.data[0] if response.data else payload
        return {
            "status": "success",
            "session_id": current_session_id,
            "payload": payload,
            "data": data
        }
    except Exception as e:
        err_msg = str(e)
        # Handle case where requested_model column has not yet been migrated in remote schema cache
        if "requested_model" in err_msg and "schema cache" in err_msg:
            # Fallback payload without the unmigrated column to maintain log continuity
            fallback_payload = {k: v for k, v in payload.items() if k != "requested_model"}
            try:
                res = client.table("chatbot_logs").insert(fallback_payload).execute()
                return {
                    "status": "warning",
                    "message": "Inserted with fallback: 'requested_model' column pending in remote Supabase schema cache",
                    "session_id": current_session_id,
                    "payload": payload,
                    "data": res.data[0] if res.data else fallback_payload
                }
            except Exception as inner_e:
                raise RuntimeError(f"Failed to insert into Supabase: {inner_e}") from inner_e
        raise RuntimeError(f"Database insertion failed: {err_msg}") from e
