# Dockerfile

# Etapa 1: Construcción de la aplicación Next.js (SIN CAMBIOS AQUÍ)
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN yarn build
RUN yarn seed:build # Para compilar el seed

# Etapa 2: Imagen de producción ligera (CAMBIOS AQUÍ)
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV production
ENV PORT 8080

# --- NUEVO: Instalar OpenSSL
# Es importante hacer un 'apt-get update' antes de instalar paquetes
RUN apt-get update && apt-get install -y openssl

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist/seed ./dist/seed 

EXPOSE 8080

# Comando para iniciar la aplicación Next.js en producción
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && yarn start -p $PORT"]