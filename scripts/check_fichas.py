"""
Revisa en Odoo qué fichas/campos existen para pacientes, prestadores y usuarios.
Chequea: campos custom en res.partner, categorías, vistas Studio, modelos custom.
Solo lectura.
"""

import os
import sys
import xmlrpc.client

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip())

def main():
    load_env()
    url = os.environ.get("ODOO_URL", "").rstrip("/")
    db = os.environ.get("ODOO_DB", "")
    user = os.environ.get("ODOO_USER", "")
    password = os.environ.get("ODOO_PASSWORD", "")

    if not all([url, db, user, password]):
        print("ERROR: Faltan variables ODOO_* en .env")
        sys.exit(1)

    common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common", allow_none=True)
    uid = common.authenticate(db, user, password, {})
    if not uid:
        print("ERROR: Autenticacion fallida")
        sys.exit(1)

    models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object", allow_none=True)

    def search_read(model, domain=None, fields=None, limit=0):
        return models.execute_kw(db, uid, password, model, "search_read",
            [domain or []], {"fields": fields or [], "limit": limit})

    def search_count(model, domain=None):
        return models.execute_kw(db, uid, password, model, "search_count", [domain or []])

    def fields_get(model, attributes=None):
        return models.execute_kw(db, uid, password, model, "fields_get",
            [], {"attributes": attributes or ["string", "type", "required", "help"]})

    print("=" * 70)
    print("  REVISION DE FICHAS — ODOO SIEMPRE CERCA")
    print("=" * 70)

    # -------------------------------------------------------
    # 1. Campos de res.partner (contactos = pacientes + prestadores)
    # -------------------------------------------------------
    print("\n[1] CAMPOS EN res.partner (Contactos)")
    partner_fields = fields_get("res.partner", ["string", "type", "required"])

    # Campos standard relevantes para el flujo
    campos_necesarios = {
        "name": "Nombre",
        "vat": "CUIT/DNI",
        "street": "Domicilio",
        "city": "Ciudad",
        "state_id": "Provincia",
        "phone": "Telefono",
        "mobile": "Celular",
        "email": "Email",
        "is_company": "Es empresa",
        "category_id": "Categorias/etiquetas",
        "comment": "Notas internas",
        "company_type": "Tipo (persona/empresa)",
    }

    print("\n  Campos standard relevantes:")
    for field, desc in campos_necesarios.items():
        if field in partner_fields:
            f = partner_fields[field]
            print(f"    [OK] {field} ({f.get('string','?')}) — tipo: {f.get('type','?')}")
        else:
            print(f"    [  ] {field} ({desc}) — NO EXISTE")

    # Campos custom (x_*)
    custom_fields = {k: v for k, v in partner_fields.items() if k.startswith("x_")}
    print(f"\n  Campos CUSTOM (x_*): {len(custom_fields)}")
    if custom_fields:
        for k, v in custom_fields.items():
            print(f"    - {k}: {v.get('string','?')} (tipo: {v.get('type','?')})")
    else:
        print("    Ninguno — no se han creado campos personalizados con Studio")

    # -------------------------------------------------------
    # 2. Categorias de contacto (para etiquetar paciente/prestador)
    # -------------------------------------------------------
    print(f"\n[2] CATEGORIAS DE CONTACTO (res.partner.category)")
    categories = search_read("res.partner.category", [], ["name", "color", "parent_id"])
    print(f"  Total: {len(categories)}")
    for c in categories:
        parent = f" (padre: {c['parent_id'][1]})" if c.get("parent_id") else ""
        print(f"    - {c['name']}{parent}")

    # -------------------------------------------------------
    # 3. Contactos existentes — cuantos hay y de que tipo
    # -------------------------------------------------------
    print(f"\n[3] CONTACTOS EXISTENTES")
    total = search_count("res.partner", [])
    empresas = search_count("res.partner", [["is_company", "=", True]])
    personas = search_count("res.partner", [["is_company", "=", False]])
    print(f"  Total: {total} (empresas: {empresas}, personas: {personas})")

    # Listar los primeros 20
    contacts = search_read("res.partner", [],
        ["name", "is_company", "email", "phone", "category_id"], limit=30)
    print(f"\n  Primeros contactos cargados:")
    for c in contacts:
        tipo = "EMPRESA" if c.get("is_company") else "persona"
        cats = ", ".join([str(x) for x in c.get("category_id", [])]) if c.get("category_id") else "-"
        print(f"    - [{tipo}] {c['name']} | email: {c.get('email','-')} | cats: {cats}")

    # -------------------------------------------------------
    # 4. Modelos custom (x_*) — creados con Studio
    # -------------------------------------------------------
    print(f"\n[4] MODELOS CUSTOM (creados con Studio)")
    try:
        custom_models = search_read("ir.model",
            [["model", "like", "x_%"]], ["name", "model", "state"])
        print(f"  Total modelos custom: {len(custom_models)}")
        for m in custom_models:
            print(f"    - {m['model']}: {m['name']} (state: {m.get('state','?')})")
        if not custom_models:
            print("    Ninguno — no se han creado modelos custom")
    except Exception as e:
        print(f"    Error: {e}")

    # -------------------------------------------------------
    # 5. Ordenes de venta (sale.order) — si existe el modulo
    # -------------------------------------------------------
    print(f"\n[5] ORDENES DE VENTA (sale.order)")
    try:
        n_orders = search_count("sale.order", [])
        print(f"  Ordenes existentes: {n_orders}")

        # Campos custom en sale.order
        so_fields = fields_get("sale.order", ["string", "type"])
        so_custom = {k: v for k, v in so_fields.items() if k.startswith("x_")}
        print(f"  Campos custom (x_*): {len(so_custom)}")
        for k, v in so_custom.items():
            print(f"    - {k}: {v.get('string','?')} (tipo: {v.get('type','?')})")
        if not so_custom:
            print("    Ninguno")
    except Exception as e:
        print(f"  Modulo Ventas no disponible o error: {e}")

    # -------------------------------------------------------
    # 6. Productos/servicios (prestaciones)
    # -------------------------------------------------------
    print(f"\n[6] PRODUCTOS/SERVICIOS (product.template)")
    try:
        products = search_read("product.template", [],
            ["name", "type", "list_price", "standard_price", "categ_id"], limit=30)
        print(f"  Total: {search_count('product.template', [])}")
        for p in products:
            cat = p.get("categ_id", [False, "-"])
            print(f"    - {p['name']} | tipo: {p.get('type','?')} | venta: {p.get('list_price',0)} | costo: {p.get('standard_price',0)} | cat: {cat[1] if cat else '-'}")
    except Exception as e:
        print(f"  Error: {e}")

    # -------------------------------------------------------
    # 7. Listas de precios (grillas)
    # -------------------------------------------------------
    print(f"\n[7] LISTAS DE PRECIOS (product.pricelist)")
    try:
        pricelists = search_read("product.pricelist", [], ["name", "currency_id", "active"])
        print(f"  Total: {len(pricelists)}")
        for pl in pricelists:
            cur = pl.get("currency_id", [False, "?"])
            print(f"    - {pl['name']} | moneda: {cur[1] if cur else '?'} | activa: {pl.get('active','-')}")
    except Exception as e:
        print(f"  Error: {e}")

    # -------------------------------------------------------
    # 8. Plantillas de email
    # -------------------------------------------------------
    print(f"\n[8] PLANTILLAS DE EMAIL (mail.template)")
    try:
        templates = search_read("mail.template", [], ["name", "model_id", "subject"], limit=30)
        print(f"  Total: {len(templates)}")
        for t in templates:
            model = t.get("model_id", [False, "?"])
            print(f"    - {t['name']} | modelo: {model[1] if model else '?'} | asunto: {t.get('subject','-')}")
    except Exception as e:
        print(f"  Error: {e}")

    # -------------------------------------------------------
    # 9. Web Studio instalado?
    # -------------------------------------------------------
    print(f"\n[9] WEB STUDIO")
    try:
        studio = search_read("ir.module.module",
            [["name", "=", "web_studio"]], ["name", "state"])
        if studio and studio[0].get("state") == "installed":
            print("  [OK] Studio INSTALADO — se pueden crear campos y vistas custom")
        else:
            print("  [ ] Studio NO instalado")
    except Exception as e:
        print(f"  Error: {e}")

    # -------------------------------------------------------
    # 10. Modulos de documentos
    # -------------------------------------------------------
    print(f"\n[10] MODULO DOCUMENTOS")
    try:
        docs = search_read("ir.module.module",
            [["name", "in", ["documents", "documents_hr"]], ["state", "=", "installed"]],
            ["name", "state"])
        if docs:
            for d in docs:
                print(f"  [OK] {d['name']} — instalado")
        else:
            print("  [ ] Modulo Documentos NO instalado")
    except Exception as e:
        print(f"  Error: {e}")

    print(f"\n{'=' * 70}")
    print(f"  FIN DE REVISION")
    print(f"{'=' * 70}\n")

if __name__ == "__main__":
    main()
