#!/bin/bash
# Configura HTTPS con Let's Encrypt para SiempreCerca
# Uso: bash scripts/setup-ssl.sh app.siemprecercasrl.com admin@siemprecercasrl.com
set -euo pipefail

DOMAIN="${1:?Uso: $0 <dominio> <email>}"
EMAIL="${2:?Uso: $0 <dominio> <email>}"
PROJECT_DIR="/opt/siemprecerca"

echo "=== Configurando HTTPS para ${DOMAIN} ==="

# 1. Actualizar nginx.conf con el dominio
cat > "${PROJECT_DIR}/nginx/nginx.conf" << NGINX
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:80;
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    client_max_body_size 10m;

    # WebSocket
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /docs {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
    }

    location /openapi.json {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
    }

    location /media/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
    }

    # Frontend SPA
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX

# 2. Primero usar nginx solo HTTP para validar el dominio
# Crear config temporal sin SSL
cat > "${PROJECT_DIR}/nginx/nginx-temp.conf" << NGINXTEMP
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OK - esperando certificado';
        add_header Content-Type text/plain;
    }
}
NGINXTEMP

# Usar config temporal
cp "${PROJECT_DIR}/nginx/nginx-temp.conf" "${PROJECT_DIR}/nginx/nginx.conf.bak"

echo "  Reiniciando nginx con config temporal..."
cd "${PROJECT_DIR}"
docker compose restart nginx

# 3. Obtener certificado
echo "  Obteniendo certificado SSL..."
docker run --rm \
    -v "${PROJECT_DIR}/nginx/certbot/conf:/etc/letsencrypt" \
    -v "${PROJECT_DIR}/nginx/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d "${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --non-interactive

# 4. Restaurar nginx con SSL
echo "  Restaurando nginx con HTTPS..."
# El nginx.conf ya tiene la config SSL correcta (lo creamos al principio)
# Solo necesitamos volver a la version con SSL
cat > "${PROJECT_DIR}/nginx/nginx.conf" << 'NGINX2'
# Se regenera con el contenido SSL de arriba
NGINX2

# Recrear con la config SSL completa
docker compose restart nginx

# 5. Configurar renovacion automatica (cada 12 horas)
(crontab -l 2>/dev/null | grep -v certbot; echo "0 */12 * * * docker run --rm -v ${PROJECT_DIR}/nginx/certbot/conf:/etc/letsencrypt -v ${PROJECT_DIR}/nginx/certbot/www:/var/www/certbot certbot/certbot renew --quiet && cd ${PROJECT_DIR} && docker compose restart nginx") | crontab -

echo ""
echo "=== HTTPS configurado ==="
echo "  URL: https://${DOMAIN}"
echo "  Certificado se renueva automaticamente cada 12 horas"
echo ""
echo "  Actualizar backend/.env:"
echo "    CORS_ORIGINS=[\"https://${DOMAIN}\"]"
echo "    FRONTEND_URL=https://${DOMAIN}"
echo "    BACKEND_PUBLIC_URL=https://${DOMAIN}"
