"""Schemas comunes reutilizables."""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class GeoPoint(BaseModel):
    lat: float
    lng: float


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    per_page: int
