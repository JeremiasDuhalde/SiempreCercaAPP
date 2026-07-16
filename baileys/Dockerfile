FROM node:20-alpine

# Dependencias nativas que Baileys puede necesitar (buffers, crypto)
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# /data se monta como volumen externo para persistir la sesion
VOLUME /data

EXPOSE 3001

CMD ["node", "index.js"]
