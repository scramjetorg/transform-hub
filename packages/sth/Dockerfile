FROM node:lts-bullseye-slim AS target

ENV HUB_DIR=/opt/transform-hub

RUN groupadd -g 997 sth \
  && useradd -g 997 -u 997 -m -d ${HUB_DIR} -s /bin/false sth

RUN apt-get update \
  && apt-get install -y gosu --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

FROM node:lts-bullseye-slim AS builder

WORKDIR /build

COPY package.json yarn.lock lerna.json tsconfig.base.json LICENSE ./

RUN yarn install --frozen-lock --silent --ignore-optional

COPY packages/adapters ./packages/adapters
COPY packages/api-server ./packages/api-server
COPY packages/sth-config ./packages/sth-config
COPY packages/host ./packages/host
COPY packages/logger ./packages/logger
COPY packages/model ./packages/model
COPY packages/sth ./packages/sth
COPY packages/supervisor ./packages/supervisor
COPY packages/symbols ./packages/symbols
COPY packages/types ./packages/types
COPY packages/load-check ./packages/load-check
COPY packages/utility ./packages/utility
COPY scripts ./scripts
COPY bin ./bin
COPY conf ./conf

RUN yarn install --frozen-lock --silent --ignore-optional
RUN LOCAL_PACKAGES=true NO_INSTALL=true yarn build:packages

FROM target

COPY --from=builder /build/dist ${HUB_DIR}

WORKDIR ${HUB_DIR}/sth

RUN yarn install --frozen-lockfile --production --silent \
    && yarn cache clean --force

COPY ./packages/sth/docker-entrypoint.sh /usr/local/bin/

ENTRYPOINT [ "docker-entrypoint.sh" ]
EXPOSE 8000
CMD [ "scramjet-transform-hub" ]
