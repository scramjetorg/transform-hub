FROM node:22-bookworm-slim

RUN apt-get update
RUN apt-get -y upgrade && \
  apt-get install -y python3-pip

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
