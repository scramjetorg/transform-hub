FROM node:lts-buster-slim as builder

RUN apt-get update && apt-get upgrade -y

WORKDIR /build

COPY package.json yarn.lock lerna.json tsconfig.base.json ./

RUN yarn install --frozen-lock

COPY packages/adapters ./packages/adapters
COPY packages/api-server ./packages/api-server
COPY packages/sth-config ./packages/sth-config
COPY packages/host ./packages/host
COPY packages/logger ./packages/logger
COPY packages/model ./packages/model
COPY packages/sth ./packages/sth
COPY packages/symbols ./packages/symbols
COPY packages/types ./packages/types
COPY packages/load-check ./packages/load-check
COPY packages/utility ./packages/utility
COPY packages/verser ./packages/verser
COPY scripts ./scripts
COPY conf ./conf
COPY LICENSE ./

RUN yarn install --frozen-lock \
  && yarn build:packages

FROM node:lts-buster-slim as release

RUN apt-get update && apt-get upgrade -y

RUN set -xe \
  && mkdir -p /app

WORKDIR /app
COPY --from=builder /build/dist ./dist

RUN ls ./dist/adapters

RUN set -xe \
    && npm install -g ./dist/sth

CMD [ "scramjet-transform-hub" ]
