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
        unzip \
    && rm -rf /var/lib/apt/lists/*

FROM node:22-bookworm-slim AS node-runtime

FROM target AS builder

WORKDIR /app/

COPY ./dist/docker-runner ./dist

FROM target

ARG CHECKPOINT_RUNTIME_DEPENDENCIES=false
COPY runtime-dependencies/ /opt/transform-hub/runtime-dependencies/
COPY scripts/checkpoint/verify-runtime-dependencies.js /usr/local/bin/verify-runtime-dependencies.js
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/bin/npm /usr/local/bin/npm
COPY --from=node-runtime /usr/local/bin/npx /usr/local/bin/npx
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules

COPY --from=builder /app/dist ${HUB_DIR}
COPY packages/runner/package.json /tmp/scramjet-runner-install/package.json
COPY packages/runner/yarn.lock /tmp/scramjet-runner-install/yarn.lock

WORKDIR ${HUB_DIR}/runner

RUN if [ "${CHECKPOINT_RUNTIME_DEPENDENCIES}" = "true" ]; then \
        node /usr/local/bin/verify-runtime-dependencies.js "${HUB_DIR}/runtime-dependencies" --runner \
            --runner-package-json /tmp/scramjet-runner-install/package.json \
            --runner-lockfile /tmp/scramjet-runner-install/yarn.lock \
        && \
        unzip -q ${HUB_DIR}/runtime-dependencies/bun/bun-linux-x64.zip -d /usr/local/lib \
        && ln -sf /usr/local/lib/bun-linux-x64/bun /usr/local/bin/bun \
        && tar -xzf ${HUB_DIR}/runtime-dependencies/yarn/yarn.tar.gz -C /usr/local/lib \
        && ln -sf /usr/local/lib/yarn-v1.22.22/bin/yarn /usr/local/bin/yarn \
        && ln -sf /usr/local/lib/yarn-v1.22.22/bin/yarn /usr/local/bin/yarnpkg \
        && yarn --cwd /tmp/scramjet-runner-install install --offline --ignore-engines --frozen-lockfile --production --silent \
            --cache-folder ${HUB_DIR}/runtime-dependencies/yarn/cache \
            --modules-folder ${HUB_DIR}/node_modules; \
    else npm install -g --no-audit --no-fund yarn \
        && yarn install --ignore-engines --frozen-lockfile --production --silent; fi \
    && yarn cache clean \
    && chmod +x ./bin/start-runner.js

COPY ./packages/runner/docker-entrypoint.sh /usr/local/bin/
COPY ./packages/runner/unpack.sh /usr/local/bin/
COPY ./packages/runner/wait-for-sequence-and-start.sh /usr/local/bin/

RUN mkdir /pipes \
    && chown ${RUNNER_USER}:${RUNNER_GROUP} /pipes

ENTRYPOINT [ "/usr/bin/tini", "--", "docker-entrypoint.sh" ]
CMD [ "start-runner" ]
