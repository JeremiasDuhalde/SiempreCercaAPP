"""Seed inicial: crea admin si no existe."""

import asyncio

from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal, engine
from app.models import Admin
from app.security import hash_password


async def seed():
    async with SessionLocal() as db:
        result = await db.execute(select(Admin).where(Admin.email == settings.admin_email))
        if result.scalar_one_or_none():
            print(f"Admin {settings.admin_email} ya existe, skip.")
            return
        admin = Admin(
            email=settings.admin_email,
            hashed_password=hash_password(settings.admin_password),
            name="Admin",
        )
        db.add(admin)
        await db.commit()
        print(f"Admin {settings.admin_email} creado.")


async def main():
    await seed()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
