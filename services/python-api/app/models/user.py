"""
User SQLAlchemy model — mirrors the Node.js users table.
Auth is delegated to Replit OIDC; this stores profile and RBAC role.
"""
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    """Platform user with RBAC role."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)  # Replit OIDC sub
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    profile_image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    role: Mapped[str] = mapped_column(
        Enum("admin", "tax_professional", "client", "viewer", name="user_role_enum"),
        default="client",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<User id={self.id!r} role={self.role}>"
