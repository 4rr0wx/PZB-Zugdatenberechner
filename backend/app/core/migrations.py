from app.core.database import engine


def stamp_latest() -> None:
    from alembic.config import Config
    from alembic import command

    config = Config("/app/alembic.ini")
    command.stamp(config, "head")


def upgrade_head() -> None:
    from alembic.config import Config
    from alembic import command

    config = Config("/app/alembic.ini")
    command.upgrade(config, "head")
