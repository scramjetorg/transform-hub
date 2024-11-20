FROM node:18-bullseye-slim

RUN apt-get update

WORKDIR /build

VOLUME [ "/dist", "/build" ]

COPY package.json yarn.lock tsconfig.base.json LICENSE ./
COPY packages ./packages
COPY scripts ./scripts

RUN yarn install --frozen-lockfile
RUN yarn build:packages -o /dist



