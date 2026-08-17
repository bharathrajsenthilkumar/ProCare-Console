import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load env variables
load_dotenv()

from app.config import settings
from app.routes import health, stats, users, chat_logs, gallery, team, storage, appointments, system_logs

app = FastAPI(
    title="Procare Console API",
    description="Backend API for the Procare Console",
    version="1.0.0"
)

# CORS middleware config
origins = settings.ALLOWED_ORIGINS
if isinstance(origins, str):
    origins = [o.strip() for o in origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
# Root-level health endpoint (GET /health)
app.include_router(health.router)

# Include API v1 routes
app.include_router(health.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(chat_logs.router, prefix="/api/v1")
app.include_router(gallery.router, prefix="/api/v1")
app.include_router(team.router, prefix="/api/v1")
app.include_router(storage.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(system_logs.router, prefix="/api/v1")


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

