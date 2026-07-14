"""
Relevamiento de instancia Odoo — Siempre Cerca SRL
Conecta via XML-RPC, detecta version, edicion, modulos, usuarios, companias.
Idempotente: solo lectura, no modifica nada.
"""

import os
import sys
import xmlrpc.client
import logging
from urllib.parse import urlparse

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def load_env():
    """Carga .env manualmente sin dependencias extra."""
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
        log.error("Faltan variables ODOO_URL, ODOO_DB, ODOO_USER o ODOO_PASSWORD en .env")
        sys.exit(1)

    log.info(f"Conectando a {url} (db={db}, user={user})")

    # ---------- Autenticacion ----------
    common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common", allow_none=True)

    try:
        version_info = common.version()
        log.info(f"Version del servidor: {version_info}")
    except Exception as e:
        log.error(f"Error obteniendo version: {e}")
        version_info = None

    try:
        uid = common.authenticate(db, user, password, {})
    except Exception as e:
        log.error(f"Error autenticando: {e}")
        sys.exit(1)

    if not uid:
        log.error("Autenticacion fallida. Verificar credenciales y base de datos.")
        sys.exit(1)

    log.info(f"Autenticado OK — uid={uid}")

    models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object", allow_none=True)

    # Helper
    def search_read(model, domain=None, fields=None, limit=0):
        return models.execute_kw(
            db, uid, password, model, "search_read",
            [domain or []],
            {"fields": fields or [], "limit": limit},
        )

    def search_count(model, domain=None):
        return models.execute_kw(
            db, uid, password, model, "search_count",
            [domain or []],
        )

    # ---------- Version y edicion ----------
    print("\n" + "=" * 70)
    print("  RELEVAMIENTO ODOO — SIEMPRE CERCA SRL")
    print("=" * 70)

    if version_info:
        sv = version_info.get("server_version", "?")
        svf = version_info.get("server_version_info", [])
        proto = version_info.get("protocol_version", "?")
        print(f"\n[VERSION]")
        print(f"  Server version: {sv}")
        print(f"  Version info:   {svf}")
        print(f"  Protocol:       {proto}")

    # Detectar edicion
    edition = "Community"
    try:
        # Si existe el modulo 'web_enterprise', es Enterprise
        ent_modules = search_read(
            "ir.module.module",
            [["name", "=", "web_enterprise"]],
            ["name", "state"],
        )
        if ent_modules and ent_modules[0].get("state") == "installed":
            edition = "Enterprise"
    except Exception:
        pass

    # Detectar si es Online (SaaS) — buscar modulo saas_worker o saas
    is_saas = False
    try:
        saas_modules = search_read(
            "ir.module.module",
            [["name", "in", ["saas_worker", "saas_subscription"]], ["state", "=", "installed"]],
            ["name", "state"],
        )
        if saas_modules:
            is_saas = True
    except Exception:
        pass

    hosting = "Odoo Online (SaaS)" if is_saas else "Odoo.sh o Self-hosted"
    print(f"\n[EDICION]")
    print(f"  Edicion:  {edition}")
    print(f"  Hosting:  {hosting}")
    if is_saas:
        print(f"  NOTA:     Odoo Online NO permite modulos custom Python.")
        print(f"            Solo Studio + automatizaciones nativas.")

    # ---------- Companias ----------
    print(f"\n[COMPANIAS]")
    companies = search_read("res.company", [], ["name", "country_id", "currency_id", "phone", "email", "vat"])
    for c in companies:
        country = c.get("country_id", [False, "?"])
        currency = c.get("currency_id", [False, "?"])
        print(f"  - {c['name']}")
        print(f"    Pais: {country[1] if country else '?'} | Moneda: {currency[1] if currency else '?'}")
        print(f"    CUIT/VAT: {c.get('vat', '-')} | Email: {c.get('email', '-')} | Tel: {c.get('phone', '-')}")

    # ---------- Usuarios ----------
    print(f"\n[USUARIOS]")
    users = search_read(
        "res.users",
        [["active", "=", True]],
        ["name", "login", "company_id"],
    )
    print(f"  Usuarios activos: {len(users)}")
    for u in users:
        comp = u.get("company_id", [False, "?"])
        print(f"  - {u['name']} ({u['login']}) — Cia: {comp[1] if comp else '?'}")

    # ---------- Modulos instalados ----------
    print(f"\n[MODULOS INSTALADOS]")
    installed = search_read(
        "ir.module.module",
        [["state", "=", "installed"]],
        ["name", "shortdesc", "author"],
    )
    print(f"  Total instalados: {len(installed)}")

    # Agrupar por relevancia
    key_modules = [
        "crm", "sale", "sale_subscription", "contacts", "account",
        "stock", "purchase", "rental", "hr", "hr_holidays",
        "hr_recruitment", "hr_appraisal", "hr_timesheet",
        "sign", "whatsapp", "mass_mailing", "im_livechat",
        "mail", "website", "portal", "documents", "survey",
        "calendar", "helpdesk", "web_studio",
    ]

    installed_names = {m["name"] for m in installed}
    print(f"\n  Modulos clave (del alcance):")
    for km in key_modules:
        status = "INSTALADO" if km in installed_names else "no instalado"
        marker = "  [OK]" if km in installed_names else "  [ ]"
        print(f"    {marker} {km} — {status}")

    # Otros modulos instalados (no standard de Odoo)
    odoo_authors = {"Odoo S.A.", "Odoo", ""}
    custom_mods = [m for m in installed if m.get("author", "") not in odoo_authors]
    if custom_mods:
        print(f"\n  Modulos custom/terceros ({len(custom_mods)}):")
        for m in custom_mods:
            print(f"    - {m['name']}: {m.get('shortdesc', '?')} (author: {m.get('author', '?')})")

    # ---------- Locale ----------
    print(f"\n[LOCALE / IDIOMA]")
    try:
        langs = search_read("res.lang", [["active", "=", True]], ["name", "code", "date_format", "decimal_point"])
        for lang in langs:
            print(f"  - {lang['name']} ({lang['code']}) — Fecha: {lang.get('date_format', '?')} — Decimal: {lang.get('decimal_point', '?')}")
    except Exception as e:
        print(f"  Error leyendo idiomas: {e}")

    # ---------- Contactos ----------
    print(f"\n[DATOS EXISTENTES]")
    n_contacts = search_count("res.partner", [])
    n_companies_contacts = search_count("res.partner", [["is_company", "=", True]])
    n_persons = search_count("res.partner", [["is_company", "=", False]])
    print(f"  Contactos totales: {n_contacts} (empresas: {n_companies_contacts}, personas: {n_persons})")

    # Facturas
    try:
        n_invoices = search_count("account.move", [["move_type", "in", ["out_invoice", "out_refund"]]])
        print(f"  Facturas de venta: {n_invoices}")
    except Exception:
        print(f"  Facturas: no se pudo leer (modulo account no activo?)")

    # Productos
    try:
        n_products = search_count("product.template", [])
        print(f"  Productos: {n_products}")
    except Exception:
        print(f"  Productos: no se pudo leer")

    # Empleados
    try:
        n_employees = search_count("hr.employee", [])
        print(f"  Empleados: {n_employees}")
    except Exception:
        print(f"  Empleados: no se pudo leer (modulo hr no activo?)")

    # Oportunidades CRM
    try:
        n_leads = search_count("crm.lead", [])
        print(f"  Oportunidades CRM: {n_leads}")
    except Exception:
        print(f"  CRM: no se pudo leer (modulo crm no activo?)")

    # ---------- Resumen ----------
    print(f"\n{'=' * 70}")
    print(f"  RESUMEN")
    print(f"{'=' * 70}")
    print(f"  Version:     {version_info.get('server_version', '?') if version_info else '?'}")
    print(f"  Edicion:     {edition}")
    print(f"  Hosting:     {hosting}")
    print(f"  Custom code: {'NO (solo Studio + automatizaciones)' if is_saas else 'SI (modulos Python posibles)'}")
    print(f"  Companias:   {len(companies)}")
    print(f"  Usuarios:    {len(users)}")
    print(f"  Modulos:     {len(installed)} instalados")
    print(f"  Contactos:   {n_contacts}")
    if is_saas:
        print(f"\n  ** IMPORTANTE: Al ser Odoo Online, las tareas custom (campos")
        print(f"     computados, vistas, reportes) se haran con Studio y/o")
        print(f"     automatizaciones nativas. No se puede subir codigo Python. **")
    print(f"{'=' * 70}\n")


if __name__ == "__main__":
    main()
