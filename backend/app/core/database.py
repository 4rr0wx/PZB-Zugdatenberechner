from __future__ import annotations

from contextlib import contextmanager
from typing import Generator, Optional

from sqlmodel import Session, SQLModel, create_engine

from .config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, echo=False, pool_pre_ping=True)


def init_db(retries: int = 5) -> None:
    last_exc: Optional[Exception] = None
    for attempt in range(1, retries + 1):
        try:
            SQLModel.metadata.create_all(engine)
            return
        except Exception as exc:  # pragma: no cover - best effort logging
            last_exc = exc
            import time

            time.sleep(attempt)
    if last_exc:
        raise last_exc


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
