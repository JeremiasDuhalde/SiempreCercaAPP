"""Agrega status, recurrence, recurrence_end, whatsapp_reminder, notes a appointments.

Revision ID: 006_appointment_enhancements
Revises: 005_user_turno
Create Date: 2026-07-02
"""

from alembic import op
import sqlalchemy as sa

revision = "006_appointment_enhancements"
down_revision = "005_user_turno"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "appointments",
        sa.Column("status", sa.String(20), server_default="pendiente", nullable=False),
    )
    op.add_column(
        "appointments",
        sa.Column("recurrence", sa.String(20), nullable=True),
    )
    op.add_column(
        "appointments",
        sa.Column("recurrence_end", sa.Date, nullable=True),
    )
    op.add_column(
        "appointments",
        sa.Column("whatsapp_reminder", sa.Boolean, server_default="false", nullable=False),
    )
    op.add_column(
        "appointments",
        sa.Column("notes", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("appointments", "notes")
    op.drop_column("appointments", "whatsapp_reminder")
    op.drop_column("appointments", "recurrence_end")
    op.drop_column("appointments", "recurrence")
    op.drop_column("appointments", "status")
