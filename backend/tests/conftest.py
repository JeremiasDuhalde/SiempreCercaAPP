"""
Fixtures compartidas para el test suite de SiempreCercaAPP.

Prerequisito: la DB de test debe existir antes de correr los tests.
Crearla una sola vez:

    docker compose exec db psql -U siemprecerca -c "CREATE DATABASE siemprecerca_test;"
    docker compose exec db psql -U siemprecerca -d siemprecerca_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"

O desde el host (con el puerto 5435 mapeado):

    psql -h localhost -p 5435 -U siemprecerca -c "CREATE DATABASE siemprecerca_test;"
    psql -h localhost -p 5435 -U siemprecerca -d siemprecerca_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models import (  # noqa: F401 — importar todos los modelos para que Base los registre
    Alert,
    AlertLog,
    Appointment,
    AuditLog,
    Client,
    Contact,
    Device,
    Geofence,
    Message,
    MessageTemplate,
    User,
    WebhookRawLog,
    WellbeingSnapshot,
)
from app.security import create_access_token, hash_password

TEST_DB = "postgresql+asyncpg://siemprecerca:siemprecerca_dev@localhost:5435/siemprecerca_test"


# ---------------------------------------------------------------------------
# Engine y sesión de test
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Crea el engine apuntando a siemprecerca_test."""
    engine = create_async_engine(TEST_DB, echo=False, future=True)

    # Habilitar PostGIS (idempotente)
    async with engine.connect() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.commit()

    # Crear todas las tablas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Eliminar todas las tablas al finalizar la sesión de tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncSession:
    """Sesión async limpia por test; hace rollback al finalizar."""
    TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with TestSession() as session:
        yield session
        # Limpiar datos entre tests sin tirar las tablas
        await session.rollback()
        # Truncar todas las tablas con datos de test en orden seguro
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()


# ---------------------------------------------------------------------------
# Cliente HTTP
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    """AsyncClient de httpx usando el transporte ASGI de FastAPI."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Tokens de autenticación
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def admin_token(db_session: AsyncSession) -> str:
    """Crea un usuario admin y devuelve su JWT."""
    user = User(
        email="admin_test@siemprecerca.app",
        hashed_password=hash_password("admin_pass_123"),
        name="Admin Test",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    return create_access_token(user.email, extra={"role": user.role, "name": user.name})


@pytest_asyncio.fixture
async def operator_token(db_session: AsyncSession) -> str:
    """Crea un usuario operador y devuelve su JWT."""
    user = User(
        email="operador_test@siemprecerca.app",
        hashed_password=hash_password("operador_pass_123"),
        name="Operador Test",
        role="operador",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    return create_access_token(user.email, extra={"role": user.role, "name": user.name})


# ---------------------------------------------------------------------------
# Datos de prueba
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def sample_client(db_session: AsyncSession) -> Client:
    """Crea un cliente de prueba en la DB y lo devuelve."""
    c = Client(
        name="Rosa Fernández",
        age=75,
        address="Av. Rivadavia 1234",
        barrio="Flores",
        phone="1155667788",
        is_active=True,
    )
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)
    return c
