from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.auth import get_current_user, supabase_admin_client

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.get("")
async def list_appointments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    date: str = Query(None),
    current_user: dict = Depends(get_current_user)
):
    offset = (page - 1) * limit
    
    query = supabase_admin_client.table("appointments").select("*", count="exact")
    
    if search:
        # Search by patient name, phone number, or whatsapp number
        query = query.or_(f"patient_name.ilike.%{search}%,phone_number.ilike.%{search}%,whatsapp_number.ilike.%{search}%")
        
    if date:
        # Filter by specific appointment date (YYYY-MM-DD)
        query = query.eq("appointment_date", date)
        
    query = query.order("appointment_date", desc=True)
    query = query.order("start_time", desc=True)
    query = query.range(offset, offset + limit - 1)
    
    try:
        res = query.execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error while querying appointments: {str(e)}"
        )
        
    return {
        "appointments": res.data or [],
        "total": res.count or 0,
        "page": page,
        "limit": limit
    }
