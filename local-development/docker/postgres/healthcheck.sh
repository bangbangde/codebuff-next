#!/bin/sh

set -eu

export PGPASSWORD="${POSTGRES_PASSWORD}"

capabilities="$(
  psql \
    --host 127.0.0.1 \
    --username "${POSTGRES_USER}" \
    --dbname "${POSTGRES_DB}" \
    --no-psqlrc \
    --quiet \
    --tuples-only \
    --no-align \
    --command "
      SELECT
        role.rolsuper
        AND role.rolcreatedb
        AND role.rolcreaterole
        AND database.datdba = role.oid
      FROM pg_roles AS role
      JOIN pg_database AS database
        ON database.datname = current_database()
      WHERE role.rolname = current_user;
    "
)"

[ "${capabilities}" = "t" ]
