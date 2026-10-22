"""Align databases created before Alembic with the production schema.

Revision ID: a1b2c3d4e5f6
Revises: 68928c167acc
Create Date: 2026-10-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "68928c167acc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> dict[str, dict]:
    return {
        column["name"]: column
        for column in sa.inspect(op.get_bind()).get_columns(table_name)
    }


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    if "audit_logs" in tables:
        audit_columns = _columns("audit_logs")
        required = {
            "username": "anonymous",
            "role": "ANONYMOUS",
            "request_id": "",
            "ip_address": "unknown",
        }
        nullable_columns = [
            name
            for name in required
            if name in audit_columns and audit_columns[name].get("nullable", True)
        ]
        if nullable_columns:
            for name in nullable_columns:
                op.execute(
                    sa.text(f"UPDATE audit_logs SET {name} = :value WHERE {name} IS NULL")
                    .bindparams(value=required[name])
                )
            with op.batch_alter_table("audit_logs") as batch:
                for name in nullable_columns:
                    batch.alter_column(
                        name,
                        existing_type=audit_columns[name]["type"],
                        nullable=False,
                    )

    if "chat_sessions" in tables:
        session_columns = _columns("chat_sessions")
        if session_columns.get("is_starred", {}).get("nullable", False):
            op.execute(sa.text("UPDATE chat_sessions SET is_starred = 0 WHERE is_starred IS NULL"))
            with op.batch_alter_table("chat_sessions") as batch:
                batch.alter_column(
                    "is_starred",
                    existing_type=session_columns["is_starred"]["type"],
                    nullable=False,
                )

        foreign_keys = sa.inspect(op.get_bind()).get_foreign_keys("chat_sessions")
        has_user_fk = any(
            fk.get("constrained_columns") == ["user_id"]
            and fk.get("referred_table") == "users"
            for fk in foreign_keys
        )
        if not has_user_fk:
            with op.batch_alter_table("chat_sessions") as batch:
                batch.create_foreign_key(
                    "fk_chat_sessions_user_id_users",
                    "users",
                    ["user_id"],
                    ["id"],
                )


def downgrade() -> None:
    # Compatibility normalization is intentionally not reversed. The previous
    # revision already defines these constraints for every fresh installation.
    pass
