FROM node:lts-bullseye-slim AS target

ENV PACKAGE_DIR=/package \
    HUB_DIR=/opt/transform-hub \
    RUNNER_USER=runner \
    RUNNER_GROUP=runner

RUN groupadd -g 1200 ${RUNNER_GROUP} \
    && useradd -g 1200 -u 1200 -m -d ${HUB_DIR} -s /bin/false ${RUNNER_USER} \
    && mkdir -p ${PACKAGE_DIR} \
    && chown ${RUNNER_USER}:${RUNNER_GROUP} ${PACKAGE_DIR}

RUN apt-get update \
    && apt-get install -y gosu tini --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

FROM node:lts-bullseye-slim AS builder

WORKDIR /app/

COPY ./dist/utility ./dist/utility
COPY ./dist/symbols ./dist/symbols
COPY ./dist/obj-logger ./dist/obj-logger
COPY ./dist/model ./dist/model
COPY ./dist/runner ./dist/runner
COPY ./dist/package.json ./dist/package.json

FROM target

COPY --from=builder /app/dist ${HUB_DIR}

WORKDIR ${HUB_DIR}/runner

RUN yarn install --ignore-engines  --frozen-lockfile --production --silent \
    && yarn cache clean \
    && chmod +x ./bin/start-runner.js

COPY ./packages/runner/docker-entrypoint.sh /usr/local/bin/
COPY ./packages/runner/unpack.sh /usr/local/bin/
COPY ./packages/runner/wait-for-sequence-and-start.sh /usr/local/bin/

RUN mkdir /pipes \
    && chown ${RUNNER_USER}:${RUNNER_GROUP} /pipes

ENTRYPOINT [ "/usr/bin/tini", "--", "docker-entrypoint.sh" ]
CMD [ "start-runner" ]

