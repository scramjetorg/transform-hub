FROM node:22-bookworm-slim AS builder

RUN apt-get update
RUN apt-get -y upgrade && \
  apt-get install -y python3-pip

WORKDIR /build

COPY package.json yarn.lock lerna.json tsconfig.base.json LICENSE ./

COPY cpm/scripts ./cpm/scripts

COPY cpm/packages/manager ./cpm/packages/manager
COPY cpm/packages/manager-config ./cpm/packages/manager-config
COPY cpm/packages/multi-manager ./cpm/packages/multi-manager
COPY cpm/packages/platform-types ./cpm/packages/platform-types

COPY sth/packages/adapters ./sth/packages/adapters
COPY sth/packages/adapters-common ./sth/packages/adapters-common
COPY sth/packages/adapter-docker ./sth/packages/adapter-docker
COPY sth/packages/adapter-kubernetes ./sth/packages/adapter-kubernetes
COPY sth/packages/adapter-process ./sth/packages/adapter-process
COPY sth/packages/api-client ./sth/packages/api-client
COPY sth/packages/api-server ./sth/packages/api-server
COPY sth/packages/bpmux ./sth/packages/bpmux
COPY sth/packages/client-utils ./sth/packages/client-utils
COPY sth/packages/frame-stream ./sth/packages/frame-stream
COPY sth/packages/load-check ./sth/packages/load-check
COPY sth/packages/model ./sth/packages/model
COPY sth/packages/module-loader ./sth/packages/module-loader
COPY sth/packages/monitoring-server ./sth/packages/monitoring-server
COPY sth/packages/obj-logger ./sth/packages/obj-logger
COPY sth/packages/pre-runner ./sth/packages/pre-runner
COPY sth/packages/python-runner ./sth/packages/python-runner
COPY sth/packages/runner ./sth/packages/runner
COPY sth/packages/sth-config ./sth/packages/sth-config
COPY sth/packages/symbols ./sth/packages/symbols
COPY sth/packages/types ./sth/packages/types
COPY sth/packages/utility ./sth/packages/utility
COPY sth/packages/verser ./sth/packages/verser

COPY sth/tsconfig.base.json ./cpm/tsconfig.base.json
COPY sth/tsconfig.base.json ./sth/tsconfig.base.json

RUN npm install --omit=optional --legacy-peer-deps
RUN npm run build:multi-manager

FROM node:22-bookworm-slim AS target
ENV NODE_OPTIONS="--unhandled-rejections=warn"

RUN groupadd -g 998 mcpm \
    && useradd -g 998 -u 998 -m -d /opt/mcpm -s /bin/false mcpm

WORKDIR /opt/cpm
COPY --from=builder /build/dist ./dist

RUN npm install --omit=dev -g ./dist/multi-manager

EXPOSE 11000
EXPOSE 11001

USER mcpm
ENTRYPOINT [ "scramjet-cloud-platform-multi-manager" ]
