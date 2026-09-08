from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from app.auth import get_current_user, require_console_admin, supabase_admin_client

router = APIRouter(prefix="/appointments", tags=["appointments"])

# Valid status choices
VALID_STATUSES = ["pending", "confirmed", "visited", "canceled", "no_show"]

# Timezone configuration: India Standard Time (IST, UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))


class AppointmentItem(BaseModel):
    id: str
    patient_name: Optional[str] = None
    phone_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    appointment_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: str = "pending"
    created_at: Optional[str] = None


class AppointmentsListResponse(BaseModel):
    appointments: List[AppointmentItem]
    total: int
    page: int
    limit: int


class UpdateAppointmentRequest(BaseModel):
    status: str


def normalize_status(raw_status: Optional[str]) -> str:
    """
    Normalizes any status representation (e.g. 'Pending', 'Confirmed / Called', 'No-Show', None)
    into a standardized lowercase key: 'pending', 'confirmed', 'visited', 'canceled', 'no_show'.
    """
    if not raw_status:
        return "pending"
    s = raw_status.strip().lower().replace(" ", "_").replace("-", "_").replace("/", "_")
    if "no_show" in s or "noshow" in s:
        return "no_show"
    if "confirm" in s or "call" in s:
        return "confirmed"
    if "visit" in s:
        return "visited"
    if "cancel" in s:
        return "canceled"
    return "pending"


def parse_appointment_datetime(date_val: Optional[str], time_val: Optional[str]) -> Optional[datetime]:
    """
    Robust multi-format date and time parser.
    Supports YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD, and ISO timestamps.
    """
    if not date_val:
        return None

    clean_date = str(date_val).strip().split("T")[0]
    date_obj = None

    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            date_obj = datetime.strptime(clean_date, fmt).date()
            break
        except Exception:
            continue

    if not date_obj:
        return None

    time_obj = None
    if time_val:
        clean_time = str(time_val).strip()
        for t_fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p"):
            try:
                time_obj = datetime.strptime(clean_time, t_fmt).time()
                break
            except Exception:
                continue

    if not time_obj:
        # Default to end of day if time is missing
        time_obj = datetime.strptime("23:59:59", "%H:%M:%S").time()

    return datetime.combine(date_obj, time_obj, tzinfo=IST)


def sync_no_show_appointments():
    """
    Automated No-Show Sync:
    Evaluates all appointments where status is NULL, 'pending', or 'confirmed'.
    If their scheduled date/time has passed in IST, it updates their status to 'no_show' in Supabase.
    """
    try:
        now_ist = datetime.now(IST)

        # 1. Fetch appointments to check for expiration
        res = supabase_admin_client.table("appointments")\
            .select("id, appointment_date, start_time, end_time, status")\
            .execute()

        if res.data:
            expired_ids = []
            for appt in res.data:
                current_status = normalize_status(appt.get("status"))
                if current_status in ("pending", "confirmed"):
                    time_to_use = appt.get("end_time") or appt.get("start_time")
                    appt_dt = parse_appointment_datetime(
                        appt.get("appointment_date"),
                        time_to_use
                    )
                    if appt_dt and appt_dt < now_ist:
                        expired_ids.append(appt["id"])

            if expired_ids:
                supabase_admin_client.table("appointments")\
                    .update({"status": "no_show"})\
                    .in_("id", expired_ids)\
                    .execute()

    except Exception as e:
        print(f"[Appointments Sync] Automated sync warning: {e}")


@router.get("", response_model=AppointmentsListResponse)
async def list_appointments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=1000),
    search: str = Query(None),
    date: str = Query(None),
    status_filter: str = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    # 1. Run automated No-Show synchronization
    sync_no_show_appointments()

    offset = (page - 1) * limit
    
    # 2. Query appointments
    query = supabase_admin_client.table("appointments").select(
        "id, patient_name, phone_number, whatsapp_number, appointment_date, start_time, end_time, status, created_at",
        count="exact"
    )

    if search:
        query = query.or_(f"patient_name.ilike.%{search}%,phone_number.ilike.%{search}%,whatsapp_number.ilike.%{search}%")

    if date:
        query = query.eq("appointment_date", date)

    if status_filter and status_filter.strip().lower() != "all":
        query = query.ilike("status", f"%{status_filter.strip().lower()}%")

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

    # 3. Clean and serialize via Pydantic model
    items: List[AppointmentItem] = []
    now_ist = datetime.now(IST)

    for row in (res.data or []):
        raw_status = row.get("status")
        normalized = normalize_status(raw_status)
        
        # Check if strictly expired based on end_time
        if normalized in ("pending", "confirmed"):
            time_to_use = row.get("end_time") or row.get("start_time")
            appt_dt = parse_appointment_datetime(
                row.get("appointment_date"),
                time_to_use
            )
            if appt_dt and appt_dt < now_ist:
                normalized = "no_show"

        row["status"] = normalized
        items.append(AppointmentItem(**row))

    return AppointmentsListResponse(
        appointments=items,
        total=res.count or len(items),
        page=page,
        limit=limit
    )


@router.post("/sync-no-show")
async def manual_sync_no_show(current_user: dict = Depends(require_console_admin)):
    """
    Explicit endpoint to trigger instant No-Show sync across all records.
    """
    sync_no_show_appointments()
    return {"message": "No-show synchronization executed successfully."}


@router.patch("/{id}")
async def update_appointment(
    id: str,
    body: UpdateAppointmentRequest,
    current_user: dict = Depends(require_console_admin)
):
    """
    Admin-only status update endpoint.
    Allows changing appointment status.
    """
    normalized_status = normalize_status(body.status)
    if normalized_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Allowed options: {', '.join(VALID_STATUSES)}"
        )

    try:
        res = supabase_admin_client.table("appointments").update({"status": normalized_status}).eq("id", id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail=f"Appointment with ID '{id}' not found.")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update appointment: {str(e)}"
        )
