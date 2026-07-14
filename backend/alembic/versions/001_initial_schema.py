"""Initial schema con PostGIS.

Revision ID: 001_initial
Revises:
Create Date: 2026-06-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geometry

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extensión PostGIS
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="operador"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # clients
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_id", sa.String(100), nullable=True, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("birthdate", sa.Date(), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("address", sa.String(300), nullable=False),
        sa.Column("address_entre", sa.String(200), nullable=True),
        sa.Column("barrio", sa.String(100), nullable=False),
        sa.Column("location", Geometry("POINT", srid=4326), nullable=True),
        sa.Column("conditions", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("medications", postgresql.JSONB(), nullable=True),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("alta_completa", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_clients_barrio", "clients", ["barrio"])

    # contacts
    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order", sa.SmallInteger(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("relationship_label", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("has_key", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_contacts_client_order", "contacts", ["client_id", "order"])

    # devices
    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("model", sa.String(50), nullable=False),
        sa.Column("serial_number", sa.String(100), nullable=True),
        sa.Column("external_device_id", sa.String(100), nullable=True, unique=True),
        sa.Column("battery_pct", sa.SmallInteger(), nullable=False, server_default=sa.text("100")),
        sa.Column("signal_strength", sa.SmallInteger(), nullable=False, server_default=sa.text("4")),
        sa.Column("last_location", Geometry("POINT", srid=4326), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_online", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # geofences
    op.create_table(
        "geofences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("center", Geometry("POINT", srid=4326), nullable=False),
        sa.Column("radius_m", sa.Integer(), nullable=False, server_default=sa.text("300")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # alerts
    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=True),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("priority", sa.SmallInteger(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="nueva"),
        sa.Column("triage_score", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("raw_payload", postgresql.JSONB(), nullable=True),
        sa.Column("resolved_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_alerts_status_triage", "alerts", ["status", sa.text("triage_score DESC")])
    op.create_index("idx_alerts_client_created", "alerts", ["client_id", sa.text("created_at DESC")])

    # alert_logs
    op.create_table(
        "alert_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alert_id", sa.Integer(), sa.ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_alert_logs_alert", "alert_logs", ["alert_id"])

    # message_templates
    op.create_table(
        "message_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(30), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("body_template", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("icon", sa.String(30), nullable=True),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # messages
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("template_key", sa.String(30), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False, server_default="whatsapp"),
        sa.Column("wa_message_id", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_messages_client", "messages", ["client_id"])

    # appointments
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("reminder_sent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_appointments_scheduled", "appointments", ["scheduled_at"])

    # wellbeing_snapshots
    op.create_table(
        "wellbeing_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("sleep_hours", sa.Float(), nullable=True),
        sa.Column("activity_steps", sa.Integer(), nullable=True),
        sa.Column("mood", sa.String(20), nullable=True),
        sa.Column("voice_analysis", postgresql.JSONB(), nullable=True),
        sa.Column("ai_score", sa.Float(), nullable=True),
        sa.Column("ai_flags", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("ai_recommendation", sa.Text(), nullable=True),
        sa.Column("family_report", sa.Text(), nullable=True),
        sa.Column("family_report_sent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_wellbeing_client_date", "wellbeing_snapshots", ["client_id", "date"], unique=True)

    # audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("detail", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_audit_entity", "audit_logs", ["entity_type", "entity_id"])
    op.create_index("idx_audit_created", "audit_logs", ["created_at"])

    # webhook_raw_logs
    op.create_table(
        "webhook_raw_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_webhook_raw_created", "webhook_raw_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("webhook_raw_logs")
    op.drop_table("audit_logs")
    op.drop_table("wellbeing_snapshots")
    op.drop_table("appointments")
    op.drop_table("messages")
    op.drop_table("message_templates")
    op.drop_table("alert_logs")
    op.drop_table("alerts")
    op.drop_table("geofences")
    op.drop_table("devices")
    op.drop_table("contacts")
    op.drop_table("clients")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS postgis")
