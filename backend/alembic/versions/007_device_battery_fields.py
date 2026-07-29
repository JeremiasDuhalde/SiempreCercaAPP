"""Agrega campos phone_battery_level y flic_battery_voltage a devices.

Revision ID: 007_device_battery_fields
Revises: 006_appointment_enhancements
Create Date: 2026-07-24
"""

from alembic import op
import sqlalchemy as sa

revision = "007_device_battery_fields"
down_revision = "006_appointment_enhancements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "devices",
        sa.Column("phone_battery_level", sa.Integer, nullable=True),
    )
    op.add_column(
        "devices",
        sa.Column("flic_battery_voltage", sa.Float, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("devices", "flic_battery_voltage")
    op.drop_column("devices", "phone_battery_level")
