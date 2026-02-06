"""add repo status

Revision ID: 0002_repo_status
Revises: 0001_init
Create Date: 2026-02-06

"""

from alembic import op
import sqlalchemy as sa


revision = "0002_repo_status"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "repos",
        sa.Column("status", sa.String(), nullable=False, server_default="not_indexed"),
    )


def downgrade() -> None:
    op.drop_column("repos", "status")
