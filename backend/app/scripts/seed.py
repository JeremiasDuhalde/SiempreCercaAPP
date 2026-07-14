"""Seed de datos demo: admin, 8 clientes del Partido de la Costa, plantillas, agenda."""

import asyncio
from datetime import date, datetime, time, timezone

from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal, engine
from app.models import (
    Appointment,
    Client,
    Contact,
    Device,
    Geofence,
    MessageTemplate,
    User,
    WellbeingSnapshot,
)
from app.security import hash_password

# Coordenadas reales del Partido de la Costa
COORDS = {
    "Santa Teresita": (-36.5383, -56.6917),
    "Mar del Tuyú": (-36.5753, -56.6869),
    "Las Toninas": (-36.4878, -56.6953),
}

CLIENTS_DATA = [
    {
        "name": "Olga Fernández",
        "age": 82,
        "phone": "+54 9 2246 50-1040",
        "address": "Calle 4 N.1832",
        "address_entre": "e/ Av. 32 y Calle 33",
        "barrio": "Santa Teresita",
        "conditions": ["Hipertensión", "Artrosis"],
        "medications": [
            {"name": "Losartán 50mg", "times": ["08:00"]},
            {"name": "Enalapril", "times": ["20:00"]},
        ],
        "color": "coral",
        "device_model": "Reloj GEO-W3",
        "battery": 74,
        "signal": 4,
        "contacts": [
            {"order": 1, "name": "Mariela Fernández", "rel": "Hija (vive a 3 cuadras)", "phone": "+54 9 2246 50-1042", "key": True},
            {"order": 2, "name": "Norma Díaz", "rel": "Vecina de al lado", "phone": "+54 9 2246 51-3320", "key": True},
            {"order": 3, "name": "Dr. Suárez", "rel": "Médico de cabecera", "phone": "+54 9 2246 48-7781", "key": False},
        ],
    },
    {
        "name": "Héctor Domínguez",
        "age": 79,
        "phone": "+54 9 2246 50-3388",
        "address": "Calle 79 N.245",
        "address_entre": "e/ Calle 2 y Calle 3",
        "barrio": "Mar del Tuyú",
        "conditions": ["EPOC", "Diabetes II"],
        "medications": [
            {"name": "Metformina 850", "times": ["08:00", "20:00"]},
            {"name": "Salbutamol", "times": ["s/n"]},
        ],
        "color": "aqua",
        "device_model": "Colgante GEO-P1",
        "battery": 38,
        "signal": 3,
        "contacts": [
            {"order": 1, "name": "Raúl Domínguez", "rel": "Hijo", "phone": "+54 9 2246 50-3390", "key": True},
            {"order": 2, "name": "Sala de 1ros Auxilios", "rel": "Emergencia (Mar del Tuyú)", "phone": "2246 42-0140", "key": False},
        ],
    },
    {
        "name": "Rosa Pereyra",
        "age": 88,
        "phone": "+54 9 2246 52-8818",
        "address": "Av. 32 N.1455",
        "address_entre": "e/ Calle 14 y Calle 15",
        "barrio": "Santa Teresita",
        "conditions": ["Insuf. cardíaca", "Glaucoma"],
        "medications": [
            {"name": "Furosemida", "times": ["08:00"]},
            {"name": "Atorvastatina", "times": ["22:00"]},
        ],
        "color": "violet",
        "device_model": "Reloj GEO-W3",
        "battery": 91,
        "signal": 4,
        "contacts": [
            {"order": 1, "name": "Ana Pereyra", "rel": "Sobrina", "phone": "+54 9 2246 52-8820", "key": True},
            {"order": 2, "name": "Encargada del edificio", "rel": "Portera (tiene llave)", "phone": "+54 9 2246 53-1190", "key": True},
            {"order": 3, "name": "SAME", "rel": "Emergencia", "phone": "107", "key": False},
        ],
    },
    {
        "name": "Antonio Gómez",
        "age": 84,
        "phone": "+54 9 2246 50-2202",
        "address": "Calle 11 N.380",
        "address_entre": "e/ Av. 9 y Calle 10",
        "barrio": "Las Toninas",
        "conditions": ["Parkinson"],
        "medications": [
            {"name": "Levodopa", "times": ["06:00", "12:00", "18:00"]},
        ],
        "color": "gold",
        "device_model": "Reloj GEO-W3",
        "battery": 62,
        "signal": 2,
        "contacts": [
            {"order": 1, "name": "Liliana Ojeda", "rel": "Cuidadora (turno día)", "phone": "+54 9 2246 50-2204", "key": True},
            {"order": 2, "name": "Sergio Gómez", "rel": "Hijo (vive en La Plata)", "phone": "+54 9 221 55-7781", "key": False},
            {"order": 3, "name": "Neurología — CIC", "rel": "Médico", "phone": "2246 43-2210", "key": False},
        ],
    },
    {
        "name": "Nélida Sosa",
        "age": 77,
        "phone": "+54 9 2246 50-6609",
        "address": "Calle 3 N.560",
        "address_entre": "e/ Calle 68 y Calle 69",
        "barrio": "Mar del Tuyú",
        "conditions": ["Demencia leve"],
        "medications": [
            {"name": "Donepecilo", "times": ["21:00"]},
        ],
        "color": "blue",
        "device_model": "Colgante GEO-P1",
        "battery": 55,
        "signal": 4,
        "geofence": True,
        "contacts": [
            {"order": 1, "name": "Jorge Sosa", "rel": "Hijo", "phone": "+54 9 2246 50-6611", "key": True},
            {"order": 2, "name": "Marta Vega", "rel": "Vecina (tiene llave)", "phone": "+54 9 2246 51-7744", "key": True},
            {"order": 3, "name": "Policía local", "rel": "Emergencia", "phone": "101", "key": False},
        ],
    },
    {
        "name": "Raúl Iglesias",
        "age": 81,
        "phone": "+54 9 2246 50-9032",
        "address": "Calle 38 N.2140",
        "address_entre": "e/ Calle 1 y Av. Costanera",
        "barrio": "Santa Teresita",
        "conditions": ["Post-ACV", "Hipertensión"],
        "medications": [
            {"name": "Aspirina", "times": ["08:00"]},
            {"name": "Amlodipina", "times": ["20:00"]},
        ],
        "color": "amber",
        "device_model": "Reloj GEO-W3",
        "battery": 88,
        "signal": 3,
        "contacts": [
            {"order": 1, "name": "Silvia Iglesias", "rel": "Esposa (convive)", "phone": "+54 9 2246 50-9034", "key": True},
            {"order": 2, "name": "Hospital Municipal", "rel": "Emergencia", "phone": "2246 42-0107", "key": False},
        ],
    },
    {
        "name": "Marta Quiroga",
        "age": 90,
        "phone": "+54 9 2246 52-4469",
        "address": "Av. 1 N.290",
        "address_entre": "e/ Calle 9 y Calle 10",
        "barrio": "Las Toninas",
        "conditions": ["Osteoporosis"],
        "medications": [
            {"name": "Calcio + Vit D", "times": ["09:00"]},
        ],
        "color": "aqua",
        "device_model": "Reloj GEO-W3",
        "battery": 43,
        "signal": 4,
        "contacts": [
            {"order": 1, "name": "Pablo Quiroga", "rel": "Nieto", "phone": "+54 9 2246 52-4471", "key": True},
            {"order": 2, "name": "Carlos Méndez", "rel": "Vecino (tiene llave)", "phone": "+54 9 2246 53-2090", "key": True},
        ],
    },
    {
        "name": "Carmen Ruiz",
        "age": 86,
        "phone": "+54 9 2246 50-1197",
        "address": "Calle 80 N.410",
        "address_entre": "e/ Calle 3 y Calle 4",
        "barrio": "Mar del Tuyú",
        "conditions": ["Hipotiroidismo", "Caídas previas"],
        "medications": [
            {"name": "Levotiroxina", "times": ["07:00"]},
        ],
        "color": "coral",
        "device_model": "Colgante GEO-P1",
        "battery": 67,
        "signal": 3,
        "contacts": [
            {"order": 1, "name": "Elena Ruiz", "rel": "Hija", "phone": "+54 9 2246 50-1199", "key": True},
            {"order": 2, "name": "Portera del edificio", "rel": "Encargada (tiene llave)", "phone": "+54 9 2246 51-8865", "key": True},
            {"order": 3, "name": "Bomberos Voluntarios", "rel": "Emergencia", "phone": "2246 42-0100", "key": False},
        ],
    },
]

TEMPLATES_DATA = [
    {
        "key": "buendia",
        "name": "Buen día",
        "body_template": "¡Buen día, {nombre}! ☀️ Que tengas un lindo día. ¿Cómo amaneciste hoy?",
        "icon": "sun",
        "color": "gold",
        "is_active": True,
    },
    {
        "key": "med",
        "name": "Recordatorio de medicación",
        "body_template": "Hola {nombre}, es hora de tu medicación: {med}. Avisanos si necesitás algo 💊",
        "icon": "pill",
        "color": "coral",
        "is_active": True,
    },
    {
        "key": "turno",
        "name": "Recordatorio de turno",
        "body_template": "{nombre}, te recordamos tu turno con {medico} mañana a las {hora} 🩺",
        "icon": "stethoscope",
        "color": "blue",
        "is_active": True,
    },
    {
        "key": "remis",
        "name": "Confirmación de remis",
        "body_template": "Tu remis pasa a buscarte a las {hora} por {direccion}. Chofer: {chofer} 🚗",
        "icon": "car",
        "color": "amber",
        "is_active": True,
    },
    {
        "key": "noche",
        "name": "Buenas noches",
        "body_template": "Buenas noches, {nombre} 🌙 Descansá. Estamos cerca por cualquier cosa.",
        "icon": "moon",
        "color": "violet",
        "is_active": False,
    },
    {
        "key": "cumple",
        "name": "Saludo de cumpleaños",
        "body_template": "¡Feliz cumpleaños, {nombre}! 🎂 Toda la familia de Siempre Cerca te abraza.",
        "icon": "gift",
        "color": "aqua",
        "is_active": True,
    },
]

WELLBEING_DATA = [
    {
        "client_idx": 0,  # Olga
        "sleep_hours": 5.1,
        "activity_steps": 1600,
        "mood": "bajo",
        "ai_score": 68.0,
        "ai_flags": ["Sueño alterado", "Ánimo bajo", "Respuesta lenta"],
        "ai_recommendation": "Sueño alterado 3 noches seguidas + ánimo bajo → sugerir control clínico",
        "family_report": "Hoy Olga tuvo un día tranquilo, pero durmió poco por tercera noche seguida y la notamos algo decaída. Tomó la medicación a horario. Caminó menos que de costumbre. Sugerimos un control médico esta semana.",
    },
    {
        "client_idx": 1,  # Héctor
        "sleep_hours": 6.3,
        "activity_steps": 1900,
        "mood": "normal",
        "ai_score": 74.0,
        "ai_flags": ["Actividad baja", "Fatiga al caminar"],
        "ai_recommendation": "Actividad 40% por debajo de su base esta semana (EPOC) → posible descompensación",
        "family_report": "Héctor se movió bastante menos esta semana y refirió fatiga al caminar. Conviene vigilar la respiración de cerca; ya dejamos una nota para control respiratorio preventivo.",
    },
    {
        "client_idx": 3,  # Antonio
        "sleep_hours": 6.6,
        "activity_steps": 2200,
        "mood": "normal",
        "ai_score": 71.0,
        "ai_flags": ["Temblor en aumento", "Voz más débil"],
        "ai_recommendation": "Aumento de temblor y micrografía vocal (progresión Parkinson) → avisar a neurología",
        "family_report": "Antonio cumplió con su medicación. Observamos un leve aumento del temblor respecto de semanas previas. Sugerimos comentarlo en el próximo control neurológico.",
    },
    {
        "client_idx": 6,  # Marta Q.
        "sleep_hours": 7.1,
        "activity_steps": 900,
        "mood": "sin dato",
        "ai_score": 79.0,
        "ai_flags": ["Sin respuesta 2 días", "Menos movilidad"],
        "ai_recommendation": "No respondió el saludo diario 2 días seguidos → verificar bienestar",
        "family_report": "No logramos contacto con Marta en los últimos dos días y se movió menos de lo habitual. Recomendamos que un familiar pase a verla o nos confirme que está bien.",
    },
    {
        "client_idx": 2,  # Rosa
        "sleep_hours": 7.2,
        "activity_steps": 2300,
        "mood": "bueno",
        "ai_score": 91.0,
        "ai_flags": ["Estable"],
        "ai_recommendation": None,
        "family_report": "Rosa tuvo un muy buen día: durmió bien, caminó incluso un poco más que ayer y tomó toda su medicación. De buen ánimo y activa.",
    },
]


async def seed() -> None:
    async with SessionLocal() as db:
        # 1. Admin
        result = await db.execute(select(User).where(User.email == settings.admin_email))
        if not result.scalar_one_or_none():
            db.add(User(
                email=settings.admin_email,
                hashed_password=hash_password(settings.admin_password),
                name="Admin",
                role="admin",
            ))
            print(f"✓ Admin {settings.admin_email} creado")
        else:
            print(f"- Admin {settings.admin_email} ya existe")

        # Operador demo
        result = await db.execute(select(User).where(User.email == "operador@siemprecerca.app"))
        if not result.scalar_one_or_none():
            db.add(User(
                email="operador@siemprecerca.app",
                hashed_password=hash_password("operador123"),
                name="María López",
                role="operador",
            ))
            print("✓ Operador demo creado")

        await db.flush()

        # 2. Clientes
        result = await db.execute(select(Client).limit(1))
        if result.scalar_one_or_none():
            print("- Clientes ya existen, skip")
            await db.commit()
            return

        client_ids: list[int] = []
        for i, cd in enumerate(CLIENTS_DATA):
            barrio = cd["barrio"]
            lat, lng = COORDS[barrio]
            # Offset pequeño para que no estén todos en el mismo punto
            lat_off = lat + (i * 0.002)
            lng_off = lng + (i * 0.001)

            client = Client(
                name=cd["name"],
                age=cd["age"],
                phone=cd.get("phone"),
                address=cd["address"],
                address_entre=cd.get("address_entre"),
                barrio=barrio,
                location=from_shape(Point(lng_off, lat_off), srid=4326),
                conditions=cd.get("conditions"),
                medications=cd.get("medications"),
                color=cd.get("color"),
                alta_completa=True,
            )
            db.add(client)
            await db.flush()
            client_ids.append(client.id)

            # Contactos
            for c in cd["contacts"]:
                db.add(Contact(
                    client_id=client.id,
                    order=c["order"],
                    name=c["name"],
                    relationship_label=c["rel"],
                    phone=c["phone"],
                    has_key=c["key"],
                ))

            # Device
            device = Device(
                client_id=client.id,
                model=cd["device_model"],
                external_device_id=f"SC-C{i + 1}",
                battery_pct=cd["battery"],
                signal_strength=cd["signal"],
                last_location=from_shape(Point(lng_off, lat_off), srid=4326),
                last_seen_at=datetime.now(timezone.utc),
                is_online=True,
            )
            db.add(device)

            # Geocerca para Nélida (demencia leve)
            if cd.get("geofence"):
                db.add(Geofence(
                    client_id=client.id,
                    center=from_shape(Point(lng_off, lat_off), srid=4326),
                    radius_m=300,
                    is_active=True,
                ))

            print(f"✓ Cliente: {cd['name']} ({barrio})")

        # 3. Plantillas de mensajes
        for t in TEMPLATES_DATA:
            db.add(MessageTemplate(**t))
        print("✓ 6 plantillas de mensajes creadas")

        # 4. Agenda del día (demo)
        today = date.today()
        agenda_items = [
            (0, "med", "08:00", "Losartán 50mg — recordatorio enviado"),
            (6, "remis", "09:30", "Remis a control oftalmológico — Chofer Marcelo"),
            (1, "turno", "10:30", "Dr. Suárez — Hospital Privado de Comunidad"),
            (3, "med", "12:00", "Levodopa — dosis del mediodía"),
            (3, "remis", "15:00", "Remis a kinesiología — ida y vuelta"),
            (2, "turno", "16:30", "Cardiología — control trimestral"),
            (0, "med", "20:00", "Enalapril — recordatorio nocturno"),
            (None, "noche", "21:00", "Saludo de buenas noches — 8 clientes"),
        ]
        for ci, tipo, hora_str, detalle in agenda_items:
            h, m = map(int, hora_str.split(":"))
            scheduled = datetime.combine(today, time(h, m), tzinfo=timezone.utc)
            db.add(Appointment(
                client_id=client_ids[ci] if ci is not None else None,
                type=tipo,
                scheduled_at=scheduled,
                detail=detalle,
            ))
        print("✓ 8 items de agenda del día creados")

        # 5. Wellbeing snapshots (demo)
        for wd in WELLBEING_DATA:
            db.add(WellbeingSnapshot(
                client_id=client_ids[wd["client_idx"]],
                date=today,
                sleep_hours=wd["sleep_hours"],
                activity_steps=wd["activity_steps"],
                mood=wd["mood"],
                ai_score=wd["ai_score"],
                ai_flags=wd["ai_flags"],
                ai_recommendation=wd["ai_recommendation"],
                family_report=wd["family_report"],
            ))
        print("✓ 5 snapshots de bienestar creados")

        await db.commit()
        print("\n✓ Seed completado!")


async def main() -> None:
    await seed()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
