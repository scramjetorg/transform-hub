# MultiManager repro image — uses pre-built dist/ artifacts from the monorepo.
# Build from sth/:
#   docker build -t repro-mm -f repro/manager-aggregation/Dockerfile.mm .

FROM node:20-bookworm-slim AS builder

WORKDIR /build
COPY dist/ ./dist/

# Install dist workspace deps (production only)
WORKDIR /build/dist
RUN npm install --omit=dev --no-audit --no-fund 2>&1

FROM node:20-bookworm-slim

RUN groupadd -g 998 sth && useradd -g 998 -u 998 -m -d /opt/sth -s /bin/false sth

WORKDIR /dist
COPY --from=builder /build/dist/ ./dist/

# Copy entry helper
COPY repro/manager-aggregation/scripts/wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

WORKDIR /dist/dist

USER sth

ENTRYPOINT ["node", "multi-manager/bin/start.js"]
