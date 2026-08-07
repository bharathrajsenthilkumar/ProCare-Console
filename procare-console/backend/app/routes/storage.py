import math
from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user, supabase_admin_client

router = APIRouter(prefix="/storage", tags=["storage"])

# Centralized Free Plan resource quotas
FREE_PLAN_DATABASE_LIMIT_BYTES = 500 * 1024 * 1024  # 500 MB
FREE_PLAN_STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024  # 1 GB

def format_size(bytes_val: int) -> str:
    if bytes_val <= 0:
        return "0 Bytes"
    size_name = ("Bytes", "KB", "MB", "GB", "TB")
    i = int(math.floor(math.log(bytes_val, 1024)))
    p = math.pow(1024, i)
    s = round(bytes_val / p, 2)
    return f"{s} {size_name[i]}"

def get_bucket_files(bucket_id: str, path: str = "") -> list:
    files = []
    items = supabase_admin_client.storage.from_(bucket_id).list(path)
    for item in items:
        # File entries contain a valid uuid 'id' field, directories have None or no 'id'
        if item.get("id") is not None:
            files.append(item)
        else:
            folder_name = item.get("name")
            subpath = f"{path}/{folder_name}" if path else folder_name
            files.extend(get_bucket_files(bucket_id, subpath))
    return files

@router.get("/metrics")
async def get_storage_metrics(current_user: dict = Depends(get_current_user)):
    buckets = ["gallery-images", "team-images"]
    bucket_data = []
    total_application_storage_bytes = 0
    total_files_stored = 0
    
    # 1. Fetch Storage Bucket Metrics
    for bucket in buckets:
        try:
            files = get_bucket_files(bucket)
            file_count = len(files)
            total_files_stored += file_count
            bucket_bytes = 0
            for f in files:
                metadata = f.get("metadata") or {}
                size = metadata.get("size") or metadata.get("contentLength") or 0
                bucket_bytes += size
                
            total_application_storage_bytes += bucket_bytes
            bucket_data.append({
                "name": bucket,
                "file_count": file_count,
                "total_bytes": bucket_bytes,
                "total_formatted": format_size(bucket_bytes)
            })
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to calculate storage metrics for bucket '{bucket}': {str(e)}"
            )

    # 2. Fetch Database Table Metrics via get_table_metrics() RPC
    database_tables = []
    database_table_available = False
    database_table_storage_total_bytes = 0
    
    try:
        res = supabase_admin_client.rpc("get_table_metrics").execute()
        if res.data:
            database_table_available = True
            for table in res.data:
                table_name = table.get("table_name")
                row_count = table.get("row_count", 0)
                data_bytes = table.get("data_size_bytes", 0)
                index_bytes = table.get("index_size_bytes", 0)
                total_bytes_val = table.get("total_size_bytes", 0)
                
                database_table_storage_total_bytes += total_bytes_val
                
                database_tables.append({
                    "table_name": table_name,
                    "row_count": row_count,
                    "data_size_bytes": data_bytes,
                    "index_size_bytes": index_bytes,
                    "total_size_bytes": total_bytes_val,
                    "data_size_formatted": format_size(data_bytes),
                    "index_size_formatted": format_size(index_bytes),
                    "total_size_formatted": format_size(total_bytes_val)
                })
    except Exception as e:
        print("Database table metrics RPC not available:", e)
        database_table_available = False

    # 3. Fetch Actual Database Size via get_database_size() RPC
    database_size_bytes = 0
    database_size_available = False
    
    try:
        db_res = supabase_admin_client.rpc("get_database_size").execute()
        if db_res.data is not None:
            # We cast to int as get_database_size returns bigint
            database_size_bytes = int(db_res.data)
            database_size_available = True
    except Exception as e:
        print("Database size RPC not available:", e)
        database_size_available = False

    # 4. Quota and remaining capacity calculations
    # Storage calculations
    storage_capacity_bytes = FREE_PLAN_STORAGE_LIMIT_BYTES
    storage_used_bytes = total_application_storage_bytes
    storage_remaining_bytes = max(storage_capacity_bytes - storage_used_bytes, 0)
    storage_usage_percentage = (storage_used_bytes / storage_capacity_bytes) * 100 if storage_capacity_bytes > 0 else 0

    # Database calculations
    database_capacity_bytes = FREE_PLAN_DATABASE_LIMIT_BYTES
    database_remaining_bytes = max(database_capacity_bytes - database_size_bytes, 0)
    database_usage_percentage = (database_size_bytes / database_capacity_bytes) * 100 if database_capacity_bytes > 0 else 0

    # Calculate status level
    if database_usage_percentage >= 100:
        database_usage_status = "Database Capacity Exceeded"
    elif database_usage_percentage >= 95:
        database_usage_status = "Critical"
    elif database_usage_percentage >= 90:
        database_usage_status = "Warning"
    elif database_usage_percentage >= 80:
        database_usage_status = "Approaching Limit"
    else:
        database_usage_status = "Normal"

    return {
        # Section A: Storage Bucket Metrics
        "total_bytes": total_application_storage_bytes,
        "total_formatted": format_size(total_application_storage_bytes),
        "total_files_stored": total_files_stored,
        "buckets": bucket_data,

        # Section B: Database Table Storage Metrics
        "database_table_available": database_table_available,
        "database_tables": database_tables,
        "database_table_storage_total_bytes": database_table_storage_total_bytes,
        "database_table_storage_total_formatted": format_size(database_table_storage_total_bytes),

        # Section C: Supabase Resource Usage (Actual Database Sizing and Storage Quotas)
        "database_size_available": database_size_available,
        "database_size_bytes": database_size_bytes,
        "database_size_formatted": format_size(database_size_bytes) if database_size_available else "Unavailable",
        "database_capacity_bytes": database_capacity_bytes,
        "database_capacity_formatted": format_size(database_capacity_bytes),
        "database_remaining_bytes": database_remaining_bytes,
        "database_remaining_formatted": format_size(database_remaining_bytes) if database_size_available else "Unavailable",
        "database_usage_percentage": database_usage_percentage if database_size_available else 0,
        "database_usage_status": database_usage_status,

        "storage_capacity_bytes": storage_capacity_bytes,
        "storage_capacity_formatted": format_size(storage_capacity_bytes),
        "storage_used_bytes": storage_used_bytes,
        "storage_used_formatted": format_size(storage_used_bytes),
        "storage_remaining_bytes": storage_remaining_bytes,
        "storage_remaining_formatted": format_size(storage_remaining_bytes),
        "storage_usage_percentage": storage_usage_percentage,
    }
