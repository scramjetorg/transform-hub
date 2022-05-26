FROM node:lts-bullseye-slim as builder

WORKDIR /build

COPY ./dist/adapters ./dist/adapters
COPY ./dist/api-server ./dist/api-server
COPY ./dist/sth-config ./dist/sth-config
COPY ./dist/host ./dist/host
COPY ./dist/obj-logger ./dist/obj-logger
COPY ./dist/model ./dist/model
COPY ./dist/runner ./dist/runner
COPY ./dist/pre-runner ./dist/pre-runner
COPY ./dist/python-runner ./dist/python-runner
COPY ./dist/sth ./dist/sth
COPY ./dist/symbols ./dist/symbols
COPY ./dist/types ./dist/types
COPY ./dist/load-check ./dist/load-check
COPY ./dist/utility ./dist/utility
COPY ./dist/verser ./dist/verser
COPY ./dist/package.json ./dist/package.json
COPY LICENSE ./

RUN cd dist && npx -y npm@8 i

FROM node:lts-bullseye-slim as release

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
