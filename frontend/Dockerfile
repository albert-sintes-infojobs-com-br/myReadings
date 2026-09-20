# Etapa de build
FROM node:20-alpine AS build
WORKDIR /app

# CA adicional opcional (entornos con proxy de inspección TLS). Vacío por defecto:
# no añade ningún certificado y no afecta a builds normales. Ver docs/08 (bloqueo #1).
COPY certs/extra-ca.pem ./certs/extra-ca.pem
ENV NODE_EXTRA_CA_CERTS=/app/certs/extra-ca.pem

COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de producción (servidor estático ligero)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
