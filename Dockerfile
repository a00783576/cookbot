# Dockerfile

# Etapa 1: Construcción de la aplicación Next.js
# Usa una imagen base de Node.js ligera para la construcción
FROM node:20-slim AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia package.json y yarn.lock (o package-lock.json si usas npm)
COPY package.json yarn.lock* ./
# Instala las dependencias, incluyendo Prisma Client
RUN yarn install --frozen-lockfile

# Copia el resto de los archivos de la aplicación
COPY . .

# Genera el cliente de Prisma (necesario para el runtime)
RUN npx prisma generate

# Construye la aplicación Next.js para producción
RUN yarn build

# Etapa 2: Imagen de producción ligera
# Usa una imagen base muy ligera para la aplicación final
FROM node:20-slim AS runner

# Establece el directorio de trabajo
WORKDIR /app

# Establece variables de entorno para Next.js en producción
ENV NODE_ENV production
# Configura el puerto en el que escuchará la aplicación dentro del contenedor
# Azure Container Apps asignará un puerto externo, pero el contenedor debe escuchar en este.
ENV PORT 8080

# Copia los archivos de Next.js generados y los necesarios para la ejecución
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Expose el puerto
EXPOSE 8080

# Comando para iniciar la aplicación Next.js en producción
CMD ["sh", "-c", "npx prisma migrate deploy &&  yarn start"]