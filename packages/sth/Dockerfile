FROM node:buster as builder

WORKDIR /build

COPY package.json yarn.lock lerna.json tsconfig.base.json ./

RUN yarn install --frozen-lock

COPY packages/adapters ./packages/adapters
COPY packages/api-client ./packages/api-client
COPY packages/api-server ./packages/api-server
COPY packages/sth-config ./packages/sth-config
COPY packages/host ./packages/host
COPY packages/logger ./packages/logger
COPY packages/model ./packages/model
COPY packages/sth ./packages/sth
COPY packages/supervisor ./packages/supervisor
COPY packages/symbols ./packages/symbols
COPY packages/types ./packages/types
COPY scripts ./scripts
COPY bin ./bin
COPY conf ./conf
COPY LICENSE ./

RUN yarn install --frozen-lock \
  && yarn build:packages

FROM node:buster as release

RUN set -xe \
  && mkdir -p /app

WORKDIR /app
COPY --from=builder /build/dist ./dist

RUN set -xe \
    && npm install -g ./dist/sth

CMD [ "scramjet-transform-hub" ]
