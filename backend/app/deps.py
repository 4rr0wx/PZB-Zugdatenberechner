from collections.abc import Generator

from fastapi import Depends
from sqlmodel import Session

from .core.database import session_scope


def get_session() -> Generator[Session, None, None]:
    with session_scope() as session:
        yield session
