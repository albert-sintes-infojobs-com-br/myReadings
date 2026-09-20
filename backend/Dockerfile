# Etapa de build
# Nota: se usa node:20 (Debian/glibc), NO node:20-alpine — el schema-engine/query-engine
# de Prisma detecta mal la versión de OpenSSL en musl (alpine) y puede descargar el
# binario equivocado o fallar en tiempo de ejecución (ver docs/08, bloqueo #1).
FROM node:20 AS build
WORKDIR /app

# CA adicional opcional (entornos con proxy de inspección TLS). Vacío por defecto:
# no añade ningún certificado y no afecta a builds normales. Ver docs/08 (bloqueo #1).
COPY certs/extra-ca.pem ./certs/extra-ca.pem
ENV NODE_EXTRA_CA_CERTS=/app/certs/extra-ca.pem

# Copia solo dependencias primero para aprovechar la caché
COPY package.json package-lock.json* ./
RUN npm install

# Copia el resto del código y compila
COPY . .
RUN npx prisma generate && npm run build
RUN npm prune --omit=dev

# Etapa de producción
FROM node:20
WORKDIR /app
ENV NODE_ENV=production

# Mismo CA opcional: `prisma migrate deploy` puede descargar el schema-engine en el
# primer arranque si no quedó cacheado por `prisma generate` en el build.
COPY --from=build /app/certs/extra-ca.pem ./certs/extra-ca.pem
ENV NODE_EXTRA_CA_CERTS=/app/certs/extra-ca.pem

COPY --from=build /app/package.json package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3000

# Aplica migraciones y arranca
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
