from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .core.config import get_settings
from .core.database import engine, init_db
from .core.migrations import upgrade_head
from .telemetry import configure_telemetry

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

configure_telemetry(app=app, engine=engine)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    upgrade_head()


@app.get("/healthz")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(router, prefix=settings.api_prefix)
