"""Prueba de autenticacion con distintas combinaciones de DB y usuario."""

import xmlrpc.client
import sys

url = "https://siempre-cerca-srl.odoo.com"
password = "?SVZG8,*wn!#xDb"

# Posibles nombres de DB
dbs = [
    "siempre-cerca-srl",
    "siempre-cerca-srl-main",
    "siempre-cerca-srl-production",
    "siemprecercasrl",
]

# Posibles usuarios (con y sin tilde)
users = [
    "administraci\u00f3n@siemprecercasrl.com",
    "administracion@siemprecercasrl.com",
]

common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common", allow_none=True)

# Primero intentar listar DBs
try:
    db_proxy = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/db", allow_none=True)
    db_list = db_proxy.list()
    print(f"[DBs disponibles]: {db_list}")
    dbs = db_list + dbs  # priorizar las reales
except Exception as e:
    print(f"[No se pudo listar DBs]: {e}")

seen = set()
for db in dbs:
    if db in seen:
        continue
    seen.add(db)
    for user in users:
        try:
            uid = common.authenticate(db, user, password, {})
            if uid:
                print(f"\n  ** OK ** db={db}, user={user}, uid={uid}")
                sys.exit(0)
            else:
                print(f"  FAIL  db={db}, user={user} -> uid=False")
        except Exception as e:
            print(f"  ERROR db={db}, user={user} -> {e}")

print("\nNinguna combinacion funciono.")
