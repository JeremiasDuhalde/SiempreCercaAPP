"""Tasks table.

Revision ID: 004_tasks
Revises: 003_system_config
Create Date: 2026-07-02
"""

from alembic import op
import sqlalchemy as sa

revision = "004_tasks"
down_revision = "003_system_config"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("category", sa.String(50), server_default="manual"),
        sa.Column("priority", sa.Integer, server_default="2"),
        sa.Column("status", sa.String(20), server_default="pendiente"),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("assigned_to", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_tasks_status", "tasks", ["status"])
    op.create_index("idx_tasks_priority", "tasks", ["priority"])


def downgrade():
    op.drop_index("idx_tasks_priority", table_name="tasks")
    op.drop_index("idx_tasks_status", table_name="tasks")
    op.drop_table("tasks")
