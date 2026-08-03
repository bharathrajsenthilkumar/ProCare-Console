from fastapi import APIRouter, Depends
from app.auth import get_current_user, supabase_admin_client

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    try:
        users_res = supabase_admin_client.table("users").select("id", count="exact").limit(1).execute()
        total_users = users_res.count if users_res.count is not None else 0
    except Exception as e:
        print(f"Error querying users count: {e}")
        total_users = 0

    try:
        chats_res = supabase_admin_client.table("chatbot_logs").select("serial_number", count="exact").limit(1).execute()
        total_chats = chats_res.count if chats_res.count is not None else 0
    except Exception as e:
        print(f"Error querying chats count: {e}")
        total_chats = 0

    return {
        "total_users": total_users,
        "total_chats": total_chats,
        "gallery_images": 14,
        "team_members": 4
    }

