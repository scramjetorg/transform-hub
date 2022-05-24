FROM node:lts-bullseye-slim as builder

WORKDIR /build

COPY ./dist/adapters ./dist/adapters
COPY ./dist/api-server ./dist/api-server
COPY ./dist/host ./dist/host
COPY ./dist/load-check ./dist/load-check
COPY ./dist/model ./dist/model
COPY ./dist/obj-logger ./dist/obj-logger
COPY ./dist/pre-runner ./dist/pre-runner
COPY ./dist/python-runner ./dist/python-runner
COPY ./dist/runner ./dist/runner
COPY ./dist/sth ./dist/sth
COPY ./dist/sth-config ./dist/sth-config
COPY ./dist/symbols ./dist/symbols
COPY ./dist/utility ./dist/utility
COPY ./dist/verser ./dist/verser

COPY LICENSE ./
COPY ./dist/package.json ./dist/package.json

RUN cd dist && npx -y npm@8 i
RUN cd dist && npx npm r npm@8

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
