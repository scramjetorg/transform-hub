FROM python:3.14-slim-bookworm

RUN apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y --no-install-recommends ca-certificates curl gnupg && \
  mkdir -p /etc/apt/keyrings && \
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list && \
  apt-get update && \
  apt-get install -y --no-install-recommends nodejs && \
  apt-get purge -y --auto-remove gnupg && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy all dependencies for build
COPY packages/ ./packages
COPY scripts/ ./scripts
COPY packages/cli/README.md ./README.md
COPY package.json LICENSE package-lock.json ./

# Install dependencies
RUN npm install

COPY tsconfig.base.json ./tsconfig.base.json

RUN npm run build:packages
