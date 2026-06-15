# Bun runtime image whose actual ENTRYPOINT is the outer Node-based
# packages/runner. The outer runner starts in the container, then spawns
# runner-bun via `bun <runner-bun-entry> <bootConfigPath>`.
#
# Build context must be the repository root, e.g.:
#   docker build -f packages/runner-bun/Dockerfile -t scramjetorg/runner-bun:dev .

FROM oven/bun:1-slim AS target

ENV PACKAGE_DIR=/package \
    HUB_DIR=/opt/transform-hub \
    RUNNER_BUN_DIR=/opt/runner-bun \
    RUNNER_USER=runner \
    RUNNER_GROUP=runner \
    NODE_MAJOR=22

RUN groupadd -g 1200 ${RUNNER_GROUP} \
    && useradd -g 1200 -u 1200 -m -d ${HUB_DIR} -s /bin/false ${RUNNER_USER} \
    && mkdir -p ${PACKAGE_DIR} ${RUNNER_BUN_DIR} \
    && chown ${RUNNER_USER}:${RUNNER_GROUP} ${PACKAGE_DIR} ${RUNNER_BUN_DIR}

# The outer runner is Node-based, while sequence execution is Bun-backed.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        gosu \
        tini \
        ca-certificates \
        curl \
        gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g --no-audit --no-fund yarn \
    && apt-get purge -y --auto-remove gnupg \
    && rm -rf /var/lib/apt/lists/*

FROM target AS builder

WORKDIR /app/

COPY ./dist/docker-runner/frame-stream ./dist/frame-stream
COPY ./dist/docker-runner/api-client ./dist/api-client
COPY ./dist/docker-runner/client-utils ./dist/client-utils
COPY ./dist/docker-runner/utility ./dist/utility
COPY ./dist/docker-runner/symbols ./dist/symbols
COPY ./dist/docker-runner/obj-logger ./dist/obj-logger
COPY ./dist/docker-runner/model ./dist/model
COPY ./dist/docker-runner/runner ./dist/runner
COPY ./dist/docker-runner/runner-node ./dist/runner-node
COPY ./dist/docker-runner/runner-bun ./dist/runner-bun
COPY ./dist/docker-runner/api-server ./dist/api-server

FROM target

COPY --from=builder /app/dist ${HUB_DIR}

WORKDIR ${HUB_DIR}/runner

RUN yarn install --ignore-engines --frozen-lockfile --production --silent \
    && yarn cache clean \
    && chmod +x ./bin/start-runner.js

COPY ./packages/runner/docker-entrypoint.sh /usr/local/bin/
COPY ./packages/runner/unpack.sh /usr/local/bin/
COPY ./packages/runner/wait-for-sequence-and-start.sh /usr/local/bin/

RUN mkdir /pipes \
    && chown ${RUNNER_USER}:${RUNNER_GROUP} /pipes

ENTRYPOINT [ "/usr/bin/tini", "--", "docker-entrypoint.sh" ]
CMD [ "start-runner" ]
