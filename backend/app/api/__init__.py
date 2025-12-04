from fastapi import APIRouter

from app.api.labels import router as labels_router
from app.api.videos import router as videos_router

api_router = APIRouter()
api_router.include_router(videos_router, prefix="/api/videos", tags=["videos"])
api_router.include_router(labels_router, prefix="/api", tags=["labels"])
