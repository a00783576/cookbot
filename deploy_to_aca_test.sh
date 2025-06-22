#!/bin/bash
set -x # Habilita el modo de depuración para ver cada comando ejecutado

# ==============================================================================
# SCRIPT DE DESPLIEGUE PARA AZURE CONTAINER APPS (ENTORNO DE PRUEBA)
# Este script automatiza la creación de recursos de Azure y el despliegue
# de tu aplicación Cookbot Next.js en Azure Container Apps.
#
# Requisitos:
# - Azure CLI instalado y autenticado (az login)
# - Docker Desktop corriendo
# - Estar en el directorio raíz de tu proyecto Cookbot
# ==============================================================================

# ==============================================================================
# PASO 0: DEFINICIÓN DE VARIABLES (¡AJUSTA ESTOS VALORES!)
#
# Es CRÍTICO que revises y modifiques estos valores según tus necesidades.
# ==============================================================================

# Variables del Grupo de Recursos y Ubicación
# Utiliza un nombre fijo para el grupo de recursos de prueba.
RESOURCE_GROUP="rg-cookbot-dev-test"         # Nombre fijo para tu grupo de recursos de desarrollo/prueba
LOCATION="eastus"                             # Región de Azure (ej. westus, eastus, centralus).

# Nombres de recursos fijos para ACR, App y PostgreSQL.
# Estos no cambiarán en cada ejecución del script, facilitando la reutilización.
ACR_NAME="cookbotacrdemo"                     # Nombre fijo para tu Azure Container Registry (ACR)
APP_NAME="cookbot-next-app"                   # Nombre de tu Container App (la aplicación Next.js)
ENVIRONMENT_NAME="cookbot-test-env"           # Nombre de tu entorno de Container Apps
POSTGRES_SERVER_NAME="cookbot-pg-server"      # Nombre fijo para tu servidor PostgreSQL

# Credenciales de PostgreSQL
POSTGRES_ADMIN_USER="cookbotadmin"            # Usuario admin de PostgreSQL (puedes cambiarlo)
POSTGRES_ADMIN_PASSWORD="C00kbot!_AZ_Pr0d@_8765" # ¡CAMBIA ESTO POR UNA CONTRASEÑA MUY SEGURA Y ÚNICA PARA AZURE!

POSTGRES_DB_NAME="cookbot_prod_db"           # Nombre de la base de datos para tu app en Azure

# URL de la imagen en tu Azure Container Registry
APP_IMAGE="${ACR_NAME}.azurecr.io/${APP_NAME}:latest"

# Tus claves de API (¡ASEGÚRATE DE QUE SEAN LAS REALES DE PROD O DE PRUEBA PARA PROD!)
# ¡IMPORTANTE! REEMPLAZA "TU_CLAVE_DE_GEMINI_DE_PRODUCCION_REAL" con tu clave real.
GEMINI_API_KEY_AZURE="${GEMINI_API_KEY}"
OPENAI_API_KEY_AZURE="${OPENAI_API_KEY}" # Si la usas, reemplaza con tu clave real

# ==============================================================================
# PASO 1: CREAR EL GRUPO DE RECURSOS (si no existe)
# ==============================================================================
echo "Creando Grupo de Recursos: $RESOURCE_GROUP en $LOCATION..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" || { echo "Error al crear el grupo de recursos. Saliendo."; exit 1; }

# ==============================================================================
# PASO 2: CREAR AZURE CONTAINER REGISTRY (ACR) (si no existe)
# ==============================================================================
echo "Verificando/Creando Azure Container Registry (ACR): $ACR_NAME..."
az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "ACR '$ACR_NAME' no existe. Creándolo..."
    az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true || { echo "Error al crear ACR. Saliendo."; exit 1; }
    echo "ACR '$ACR_NAME' creado."
else
    echo "ACR '$ACR_NAME' ya existe. Continuando."
fi
az acr login --name "$ACR_NAME" || { echo "Error al iniciar sesión en ACR. Saliendo."; exit 1; }

# ==============================================================================
# PASO 3: COMPILAR Y SUBIR TU IMAGEN DOCKER A ACR
# Asegúrate de estar en el directorio raíz de tu proyecto.
# ==============================================================================
echo "Compilando imagen Docker localmente y subiendo a ACR: $APP_IMAGE..."
docker build -t "$APP_IMAGE" . || { echo "Error al construir la imagen Docker. Saliendo."; exit 1; }
docker push "$APP_IMAGE" || { echo "Error al subir la imagen Docker a ACR. Saliendo."; exit 1; }

# ==============================================================================
# PASO 4: CREAR AZURE DATABASE FOR POSTGRESQL - FLEXIBLE SERVER (si no existe)
# ==============================================================================
echo "Verificando/Creando Azure Database for PostgreSQL - Flexible Server: $POSTGRES_SERVER_NAME..."
az postgres flexible-server show --resource-group "$RESOURCE_GROUP" --name "$POSTGRES_SERVER_NAME" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "PostgreSQL Server '$POSTGRES_SERVER_NAME' no existe. Creándolo..."
    az postgres flexible-server create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$POSTGRES_SERVER_NAME" \
        --location "$LOCATION" \
        --version 16 \
        --admin-user "$POSTGRES_ADMIN_USER" \
        --admin-password "$POSTGRES_ADMIN_PASSWORD" \
        --sku-name Standard_B1ms \
        --storage-size 32 \
        --tier Burstable \
        --public-access All || { echo "Error al crear PostgreSQL Server. Saliendo."; exit 1; }
    echo "PostgreSQL Server '$POSTGRES_SERVER_NAME' creado."
else
    echo "PostgreSQL Server '$POSTGRES_SERVER_NAME' ya existe. Continuando."
fi

echo "Configurando regla de firewall para PostgreSQL..."
# Obtén tu IP pública actual para la regla de firewall
MY_PUBLIC_IP=$(curl -s ifconfig.me)
# Intentar mostrar la regla de firewall. Si falla, es que no existe.
az postgres flexible-server firewall-rule show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$POSTGRES_SERVER_NAME" \
    --rule-name "AllowMyIP" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Regla de firewall 'AllowMyIP' no existe. Creándola..."
    az postgres flexible-server firewall-rule create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$POSTGRES_SERVER_NAME" \
        --rule-name "AllowMyIP" \
        --start-ip-address "$MY_PUBLIC_IP" \
        --end-ip-address "$MY_PUBLIC_IP" || { echo "Error al agregar regla de firewall. Saliendo."; exit 1; }
    echo "Regla de firewall 'AllowMyIP' creada."
else
    echo "Regla de firewall 'AllowMyIP' ya existe. Continuando."
fi


# Obtén el FQDN (Fully Qualified Domain Name) del servidor PostgreSQL
POSTGRES_SERVER_HOST=$(az postgres flexible-server show --resource-group "$RESOURCE_GROUP" --name "$POSTGRES_SERVER_NAME" --query "fullyQualifiedDomainName" -o tsv)

# Construye la DATABASE_URL para la aplicación en Azure
DATABASE_URL_AZURE="postgresql://${POSTGRES_ADMIN_USER}:${POSTGRES_ADMIN_PASSWORD}@${POSTGRES_SERVER_HOST}:5432/${POSTGRES_DB_NAME}?sslmode=require&schema=public"

echo "URL de la base de datos de Azure: $DATABASE_URL_AZURE"

# ==============================================================================
# PASO 5: CREAR EL ENTORNO DE AZURE CONTAINER APPS (SI NO EXISTE)
# ==============================================================================
echo "Verificando/Creando el entorno de Azure Container Apps: $ENVIRONMENT_NAME en $RESOURCE_GROUP..."
az containerapp env show --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "El entorno '$ENVIRONMENT_NAME' no existe en '$RESOURCE_GROUP'. Creándolo..."
    az containerapp env create \
        --name "$ENVIRONMENT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" || { echo "Error al crear el entorno de Container Apps. Saliendo."; exit 1; }
    echo "Entorno de Container Apps '$ENVIRONMENT_NAME' creado."
else
    echo "El entorno '$ENVIRONMENT_NAME' ya existe en '$RESOURCE_GROUP'. Continuando."
fi


# ==============================================================================
# PASO 6: DESPLEGAR TU AZURE CONTAINER APP (si existe, la actualiza)
# ==============================================================================
echo "Desplegando la Container App: $APP_NAME en el entorno: $ENVIRONMENT_NAME..."

ENV_VARS_ARRAY=(
    "DATABASE_URL=$DATABASE_URL_AZURE"
    "GEMINI_API_KEY=$GEMINI_API_KEY_AZURE"
    "OPENAI_API_KEY=$OPENAI_API_KEY_AZURE"
    "NODE_ENV=production"
    "PORT=8080"
)

# Ejecutar el comando az containerapp create y capturar su FQDN
APP_FQDN=$(az containerapp create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --environment "$ENVIRONMENT_NAME" \
    --image "$APP_IMAGE" \
    --target-port 8080 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 1 \
    --registry-server "${ACR_NAME}.azurecr.io" \
    --query "properties.latestRevisionFqdn" \
    --output tsv \
    --env-vars "${ENV_VARS_ARRAY[@]}" \
)

# Verificar el código de salida del comando anterior y salir si hubo un error
if [ $? -ne 0 ]; then
    echo "Error al crear Container App. Saliendo.";
    exit 1;
fi

echo "Container App desplegada. URL de acceso: https://$APP_FQDN"

# ==============================================================================
# PASO 7: APLICAR MIGRACIONES DE PRISMA EN AZURE
# ==============================================================================
echo "Aplicando migraciones de Prisma en la Container App..."

echo "Esperando 60 segundos para que la revisión de la Container App se propague..."
sleep 60 # Espera 60 segundos. Puedes ajustar esto si es necesario.

# Obtén el nombre de la última revisión lista (latestReadyRevisionName)
REVISION_NAME=$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.latestReadyRevisionName" -o tsv)

if [ -z "$REVISION_NAME" ]; then
    echo "Error: No se pudo obtener el nombre de la revisión activa (latestReadyRevisionName). La Container App podría no estar lista. Las migraciones no se aplicarán."
else
    echo "Ejecutando npx prisma migrate deploy en la revisión: $REVISION_NAME"
    az containerapp exec --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --command "npx prisma migrate deploy" --revision "$REVISION_NAME" || { echo "Error al aplicar migraciones. Saliendo."; exit 1; }
    echo "Migraciones de Prisma aplicadas."

    # --- NUEVO PASO: Ejecutar el script de seeding de Prisma ---
    echo "Ejecutando npx prisma db seed en la revisión: $REVISION_NAME"
    az containerapp exec --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --command "npx prisma db seed" --revision "$REVISION_NAME" || { echo "Error al ejecutar el script de seeding. Saliendo."; exit 1; }
    echo "Script de seeding de Prisma ejecutado."
fi

# ==============================================================================
# FIN DEL SCRIPT
# ==============================================================================
echo "Despliegue completado. Accede a tu aplicación en: https://$APP_FQDN"

# ==============================================================================
# IMPORTANTE: LIMPIEZA DE RECURSOS (¡PARA EVITAR COSTOS!)
#
# Descomenta las siguientes líneas y ejecútalas CUANDO HAYAS TERMINADO de probar
# y quieras eliminar TODOS los recursos creados por este script para evitar cargos.
# Asegúrate de entender que esto es PERMANENTE.
# ==============================================================================
# echo "Eliminando el grupo de recursos $RESOURCE_GROUP para evitar cargos..."
# az group delete --name "$RESOURCE_GROUP" --yes --no-wait
# echo "Eliminación del grupo de recursos $RESOURCE_GROUP iniciada."
