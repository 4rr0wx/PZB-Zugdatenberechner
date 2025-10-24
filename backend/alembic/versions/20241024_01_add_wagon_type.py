"""add wagon_type column

Revision ID: 20241024_01_add_wagon_type
Revises: 
Create Date: 2024-10-24 17:34:00

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20241024_01_add_wagon_type"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("wagon")}
    if "wagon_type" not in columns:
        op.add_column(
            "wagon",
            sa.Column("wagon_type", sa.String(length=50), nullable=False, server_default="freight"),
        )
        op.alter_column("wagon", "wagon_type", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("wagon")}
    if "wagon_type" in columns:
        op.drop_column("wagon", "wagon_type")
