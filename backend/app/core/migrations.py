from pathlib import Path


def _alembic_config_path() -> Path:
    current = Path(__file__).resolve()
    return current.parents[2] / "alembic.ini"


def upgrade_head() -> None:
    from alembic.config import Config
    from alembic import command

    config_path = _alembic_config_path()
    if not config_path.exists():
        raise RuntimeError(f"Alembic config not found at {config_path}")

    config = Config(str(config_path))
    command.upgrade(config, "head")
