import csv
import io
import datetime
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.auth import get_current_user, require_console_admin, supabase_admin_client

router = APIRouter(prefix="/system-logs", tags=["system-logs"])

class BulkDeleteSystemLogsPayload(BaseModel):
    ids: List[str]

@router.get("/export")
async def export_system_logs(current_user: dict = Depends(require_console_admin)):
    try:
        res = supabase_admin_client.table("system_logs").select("*").order("created_at", desc=True).execute()
        logs = res.data or []
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write CSV headers
        writer.writerow(["id", "created_at", "level", "action", "admin_email", "details"])
        
        for log in logs:
            writer.writerow([
                log.get("id"),
                log.get("created_at"),
                log.get("level"),
                log.get("action"),
                log.get("admin_email") or "",
                json_details_str(log.get("details"))
            ])
            
        output.seek(0)
        filename = f"system-logs-{datetime.date.today().isoformat()}.csv"
        
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export system logs: {str(e)}")

def json_details_str(details) -> str:
    if details is None:
        return ""
    if isinstance(details, (dict, list)):
        import json
        return json.dumps(details)
    return str(details)

@router.delete("")
async def delete_system_logs(payload: BulkDeleteSystemLogsPayload, current_user: dict = Depends(require_console_admin)):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="No system log IDs selected.")
    try:
        supabase_admin_client.table("system_logs").delete().in_("id", payload.ids).execute()
        return {"status": "success", "message": f"Successfully deleted {len(payload.ids)} system logs."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete system logs: {str(e)}")

@router.get("")
async def list_system_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    level: str = Query(None),
    current_user: dict = Depends(get_current_user)
):
    offset = (page - 1) * limit
    
    query = supabase_admin_client.table("system_logs").select("*", count="exact")
    
    if level:
        query = query.eq("level", level)
        
    query = query.order("created_at", desc=True)
    query = query.range(offset, offset + limit - 1)
    
    try:
        res = query.execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error while querying system logs: {str(e)}"
        )
        
    return {
        "logs": res.data or [],
        "total": res.count or 0,
        "page": page,
        "limit": limit
    }
