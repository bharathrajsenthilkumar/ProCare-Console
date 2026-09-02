import os
from pathlib import Path
from dotenv import load_dotenv

# Search locations for .env files
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

for env_path in [
    CURRENT_DIR / ".env",
    PROJECT_ROOT / ".env",
    BACKEND_DIR / ".env",
    FRONTEND_DIR / ".env",
    BACKEND_DIR / ".env.local",
    FRONTEND_DIR / ".env.local",
]:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)

SUPABASE_URL = (
    os.getenv("SUPABASE_URL")
    or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    or "https://kqyuivqtqifzpgimglhi.supabase.co"
)

SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    or "sb_publishable_dJ33brwFBuEz6CuNXa052g_E3hQcosV"
)
