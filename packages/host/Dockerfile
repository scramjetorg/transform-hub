FROM repo.int.scp.ovh/scramjet/nodejs:buster as builder

RUN set -xe \
 && mkdir -p /build

WORKDIR /build

COPY packages/adapters ./packages/adapters
COPY packages/api-client ./packages/api-client
COPY packages/api-server ./packages/api-server
COPY packages/csi-config ./packages/csi-config
COPY packages/host ./packages/host
COPY packages/logger ./packages/logger
COPY packages/model ./packages/model
COPY packages/supervisor ./packages/supervisor
COPY packages/symbols ./packages/symbols
COPY packages/types ./packages/types
COPY scripts ./scripts
COPY bin ./bin
COPY conf ./conf
COPY LICENSE package.json yarn.lock lerna.json tsconfig.base.json ./

RUN npm install -g lerna \
  && yarn link \
  && yarn install \
  && yarn build:all-packages \
  && yarn pack:pre

FROM repo.int.scp.ovh/scramjet/nodejs:buster as release

RUN set -xe \
  && mkdir -p /app

WORKDIR /app
COPY --from=builder /build/dist ./dist

RUN set -xe \
    && npm install -g ./dist/host

CMD [ "scramjet-host" ]
