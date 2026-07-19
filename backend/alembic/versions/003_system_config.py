"""System config table.

Revision ID: 003_system_config
Revises: 002_cost_tracking
Create Date: 2026-07-19
"""

from alembic import op
import sqlalchemy as sa

revision = "003_system_config"
down_revision = "002_cost_tracking"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_config",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.Text, server_default=""),
    )


def downgrade() -> None:
    op.drop_table("system_config")
