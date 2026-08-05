FROM node:22-bookworm-slim AS builder

WORKDIR /build

COPY ./dist ./dist
COPY LICENSE ./

RUN cd dist && npm i --omit=optional --omit=dev --legacy-peer-deps

FROM node:22-bookworm-slim AS release

WORKDIR /app

# python is required for running python sequences with process adapter
RUN apt-get update \
    && apt-get install -y python3 \
    && rm -rf \
        /var/lib/apt/lists/* \
        /usr/share/doc/*

COPY --from=builder /build/dist ./dist

RUN npm install -g ./dist/sth

CMD [ "scramjet-transform-hub" ]
