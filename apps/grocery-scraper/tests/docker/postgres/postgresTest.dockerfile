FROM timescale/timescaledb:latest-pg17

COPY src/db/schema.sql /docker-entrypoint-initdb.d/schema.sql
