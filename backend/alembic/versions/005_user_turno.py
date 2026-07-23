"""Agrega columna turno a users.

Revision ID: 005_user_turno
Revises: 004_tasks
Create Date: 2026-07-02
"""

from alembic import op
import sqlalchemy as sa

revision = "005_user_turno"
down_revision = "004_tasks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("turno", sa.String(20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "turno")
