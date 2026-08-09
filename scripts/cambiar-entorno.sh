#!/usr/bin/env bash
# Cambia el .env.local según la rama en la que se esté trabajando.
# Uso: cambiar-entorno.sh <main|dev>
set -euo pipefail

ENTORNO="${1:-}"
RUTA_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR_ENV="$(dirname "$RUTA_SCRIPT")/envs-local"
DESTINO="$(dirname "$RUTA_SCRIPT")/.env.local"

case "$ENTORNO" in
  main|produccion|prod)
    ORIGEN="$DIR_ENV/produccion.env"
    NOMBRE="producción (elitebarbershop-76d8b)"
    ;;
  dev|desarrollo)
    ORIGEN="$DIR_ENV/desarrollo.env"
    NOMBRE="desarrollo (dev-elite-barbershop)"
    ;;
  *)
    echo "Uso: $0 <main|dev>"
    echo "  main  → Firebase producción (elitebarbershop-76d8b)"
    echo "  dev   → Firebase desarrollo (dev-elite-barbershop)"
    exit 1
    ;;
esac

if [[ ! -f "$ORIGEN" ]]; then
  echo "Error: no existe $ORIGEN" >&2
  exit 1
fi

cp "$ORIGEN" "$DESTINO"
echo "OK: .env.local apunta a $NOMBRE"
