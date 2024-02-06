FROM node:18-bullseye-slim as builder

WORKDIR /build

COPY ./dist/adapters ./dist/adapters
COPY ./dist/api-client ./dist/api-client
COPY ./dist/client-utils ./dist/client-utils
COPY ./dist/api-server ./dist/api-server
COPY ./dist/sth-config ./dist/sth-config
COPY ./dist/host ./dist/host
COPY ./dist/obj-logger ./dist/obj-logger
COPY ./dist/manager-api-client ./dist/manager-api-client
COPY ./dist/model ./dist/model
COPY ./dist/module-loader ./dist/module-loader
COPY ./dist/runner ./dist/runner
COPY ./dist/pre-runner ./dist/pre-runner
COPY ./dist/python-runner ./dist/python-runner
COPY ./dist/sth ./dist/sth
COPY ./dist/symbols ./dist/symbols
COPY ./dist/types ./dist/types
COPY ./dist/load-check ./dist/load-check
COPY ./dist/utility ./dist/utility
COPY ./dist/verser ./dist/verser
COPY ./dist/telemetry ./dist/telemetry
COPY ./dist/package.json ./dist/package.json
COPY LICENSE ./

RUN cd dist && npx -y npm@8 i

FROM node:18-bullseye-slim as release

WORKDIR /app

# python is required for running python sequences with process adapter
RUN apt-get update \
    && apt-get install -y python3 \
    && rm -rf \
        /var/lib/apt/lists/* \
        /usr/share/doc/*

COPY --from=builder /build/dist ./dist

RUN npx npm@8 install -g ./dist/sth

CMD [ "scramjet-transform-hub" ]
