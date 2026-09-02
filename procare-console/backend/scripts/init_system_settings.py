import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Locate .env file
backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=backend_dir / ".env")

supabase_url = os.getenv("SUPABASE_URL")
service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not service_role_key:
    print("[ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.")
    sys.exit(1)

client = create_client(supabase_url, service_role_key)

def verify_or_initialize_settings():
    """Verify or seed the system_settings table with active_chatbot_model."""
    print("=" * 60)
    print("  PROCARE SYSTEM SETTINGS INITIALIZATION")
    print("=" * 60)
    print(f"Supabase Endpoint: {supabase_url}")

    try:
        res = client.table("system_settings").select("*").limit(1).execute()
        rows = res.data or []
        if rows:
            row = rows[0]
            print(f"[SUCCESS] Table 'system_settings' exists!")
            print(f"  Current active_chatbot_model: {row.get('active_chatbot_model')}")
            print(f"  Row ID: {row.get('id')}")
        else:
            print("[INFO] 'system_settings' table exists but is empty. Seeding row 1...")
            insert_res = client.table("system_settings").insert({
                "id": 1,
                "active_chatbot_model": "gemini"
            }).execute()
            print("[SUCCESS] Seeded default row:", insert_res.data)
    except Exception as e:
        err_msg = str(e)
        if "schema cache" in err_msg or "PGRST205" in err_msg:
            print("[NOTICE] Table 'system_settings' is not yet present in Supabase schema cache.")
            print("Please execute the schema migration in Supabase SQL Editor:")
            sql_file = Path(__file__).resolve().parent / "init_system_settings.sql"
            if sql_file.exists():
                print("-" * 60)
                print(sql_file.read_text(encoding="utf-8"))
                print("-" * 60)
        else:
            print(f"[ERROR] Querying system_settings failed: {e}")

if __name__ == "__main__":
    verify_or_initialize_settings()
