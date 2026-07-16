"""Cost tracking table.

Revision ID: 002_cost_tracking
Revises: 001_initial
Create Date: 2026-07-02
"""
from alembic import op
import sqlalchemy as sa

revision = "002_cost_tracking"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cost_records",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("service", sa.String(50), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False, server_default="0"),
        sa.Column("unit_cost_usd", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("total_cost_usd", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("detail", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_cost_records_date", "cost_records", ["date"])
    op.create_index("ix_cost_records_service", "cost_records", ["service"])


def downgrade() -> None:
    op.drop_index("ix_cost_records_service", table_name="cost_records")
    op.drop_index("ix_cost_records_date", table_name="cost_records")
    op.drop_table("cost_records")
