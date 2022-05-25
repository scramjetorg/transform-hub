FROM node:lts-bullseye-slim as builder

WORKDIR /build

COPY ./dist/docker-sth ./dist

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
