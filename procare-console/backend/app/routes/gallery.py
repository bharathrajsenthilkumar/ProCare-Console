import os
import uuid
from pydantic import BaseModel
from typing import List
from urllib.parse import unquote
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.auth import get_current_user, require_console_admin, supabase_admin_client

router = APIRouter(prefix="/gallery", tags=["gallery"])

class ReorderItem(BaseModel):
    id: int
    display_order: int

@router.get("")
async def list_gallery_items(current_user: dict = Depends(get_current_user)):
    res = supabase_admin_client.table("gallery_images").select("*").order("display_order", desc=False).execute()
    return res.data or []

@router.post("/reorder")
async def reorder_gallery_items(
    items: List[ReorderItem],
    current_user: dict = Depends(require_console_admin)
):
    try:
        for item in items:
            supabase_admin_client.table("gallery_images").update({
                "display_order": item.display_order
            }).eq("id", item.id).execute()
        return {"status": "success", "message": "Gallery sequence updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update gallery sequence: {str(e)}")

@router.get("/{id}")
async def get_gallery_item(id: int, current_user: dict = Depends(get_current_user)):
    res = supabase_admin_client.table("gallery_images").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    return res.data[0]

@router.post("")
async def create_gallery_item(
    display_order: int = Form(0),
    is_active: bool = Form(True),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_console_admin)
):
    # 1. Validate image format & MIME type
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Invalid image file format. Supported: jpg, jpeg, png, webp, gif")
    if file.content_type not in ["image/jpeg", "image/png", "image/webp", "image/gif"]:
        raise HTTPException(status_code=400, detail="Invalid image MIME type")
        
    # 2. Size limit
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB")
        
    # 3. Upload to storage
    unique_name = f"{uuid.uuid4().hex}{ext}"
    bucket = "gallery-images"
    try:
        supabase_admin_client.storage.from_(bucket).upload(
            path=unique_name,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image to storage: {str(e)}")
        
    # 4. Get public URL
    public_url = supabase_admin_client.storage.from_(bucket).get_public_url(unique_name)
    
    # 5. Insert to DB
    try:
        db_res = supabase_admin_client.table("gallery_images").insert({
            "image_path": public_url,
            "display_order": display_order,
            "is_active": is_active
        }).execute()
        
        if not db_res.data:
            raise Exception("No data returned from database insert")
        return db_res.data[0]
    except Exception as e:
        # Prevent orphans
        try:
            supabase_admin_client.storage.from_(bucket).remove([unique_name])
        except Exception as cleanup_err:
            print(f"Failed to clean up orphaned storage file '{unique_name}': {cleanup_err}")
        raise HTTPException(status_code=500, detail=f"Failed to save gallery record to database: {str(e)}")

@router.patch("/{id}")
async def update_gallery_item(
    id: int,
    display_order: int = Form(None),
    is_active: bool = Form(None),
    file: UploadFile = File(None),
    current_user: dict = Depends(require_console_admin)
):
    # Fetch existing
    res = supabase_admin_client.table("gallery_images").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    existing_record = res.data[0]
    old_image_path = existing_record.get("image_path")
    
    update_data = {}
    if display_order is not None:
        update_data["display_order"] = display_order
    if is_active is not None:
        update_data["is_active"] = is_active
        
    new_filename = None
    bucket = "gallery-images"
    
    if file is not None:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            raise HTTPException(status_code=400, detail="Invalid image file format")
        if file.content_type not in ["image/jpeg", "image/png", "image/webp", "image/gif"]:
            raise HTTPException(status_code=400, detail="Invalid image MIME type")
            
        file_bytes = await file.read()
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB")
            
        new_filename = f"{uuid.uuid4().hex}{ext}"
        try:
            supabase_admin_client.storage.from_(bucket).upload(
                path=new_filename,
                file=file_bytes,
                file_options={"content-type": file.content_type}
            )
            new_public_url = supabase_admin_client.storage.from_(bucket).get_public_url(new_filename)
            update_data["image_path"] = new_public_url
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload replacement image: {str(e)}")
            
    try:
        if update_data:
            db_res = supabase_admin_client.table("gallery_images").update(update_data).eq("id", id).execute()
            if not db_res.data:
                raise Exception("No data returned from database update")
            updated_record = db_res.data[0]
        else:
            updated_record = existing_record
            
        if file is not None and old_image_path:
            try:
                old_filename = unquote(old_image_path.split("/")[-1])
                if "/gallery-images/" in old_image_path:
                    supabase_admin_client.storage.from_(bucket).remove([old_filename])
            except Exception as delete_err:
                print(f"Failed to clean up old storage file '{old_image_path}': {delete_err}")
                
        return updated_record
    except Exception as e:
        if new_filename:
            try:
                supabase_admin_client.storage.from_(bucket).remove([new_filename])
            except Exception as cleanup_err:
                print(f"Failed to clean up replacement file '{new_filename}': {cleanup_err}")
        raise HTTPException(status_code=500, detail=f"Failed to update database record: {str(e)}")

@router.delete("/{id}")
async def delete_gallery_item(id: int, current_user: dict = Depends(require_console_admin)):
    res = supabase_admin_client.table("gallery_images").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    record = res.data[0]
    image_path = record.get("image_path")
    
    bucket = "gallery-images"
    if image_path and "/gallery-images/" in image_path:
        try:
            filename = unquote(image_path.split("/")[-1])
            supabase_admin_client.storage.from_(bucket).remove([filename])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete storage file: {str(e)}")
            
    try:
        db_res = supabase_admin_client.table("gallery_images").delete().eq("id", id).execute()
        return {"status": "success", "message": "Gallery item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete database record: {str(e)}")
