FROM node:22-bookworm-slim AS target

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

FROM node:22-bookworm-slim AS builder

WORKDIR /app/

COPY ./dist/docker-runner ./dist

FROM target

ARG CHECKPOINT_RUNTIME_DEPENDENCIES=false
COPY runtime-dependencies/ /opt/transform-hub/runtime-dependencies/
COPY scripts/checkpoint/verify-runtime-dependencies.js /usr/local/bin/verify-runtime-dependencies.js

COPY --from=builder /app/dist ${HUB_DIR}
COPY packages/runner/package.json /tmp/scramjet-runner-install/package.json
COPY packages/runner/yarn.lock /tmp/scramjet-runner-install/yarn.lock

WORKDIR ${HUB_DIR}/runner

RUN if [ "${CHECKPOINT_RUNTIME_DEPENDENCIES}" = "true" ]; then \
        node /usr/local/bin/verify-runtime-dependencies.js "/opt/transform-hub/runtime-dependencies" --runner \
            --runner-package-json /tmp/scramjet-runner-install/package.json \
            --runner-lockfile /tmp/scramjet-runner-install/yarn.lock \
        && \
        tar -xzf /opt/transform-hub/runtime-dependencies/yarn/yarn.tar.gz -C /usr/local/lib \
        && ln -sf /usr/local/lib/yarn-v1.22.22/bin/yarn /usr/local/bin/yarn \
        && ln -sf /usr/local/lib/yarn-v1.22.22/bin/yarn /usr/local/bin/yarnpkg \
        && yarn --cwd /tmp/scramjet-runner-install install --offline --ignore-engines --frozen-lockfile --production --silent \
            --cache-folder /opt/transform-hub/runtime-dependencies/yarn/cache \
            --modules-folder ${HUB_DIR}/node_modules; \
    else yarn install --ignore-engines --frozen-lockfile --production --silent; fi \
    && yarn cache clean \
    && chmod +x ./bin/start-runner.js

COPY ./packages/runner/docker-entrypoint.sh /usr/local/bin/
COPY ./packages/runner/unpack.sh /usr/local/bin/
COPY ./packages/runner/wait-for-sequence-and-start.sh /usr/local/bin/

RUN mkdir /pipes \
    && chown ${RUNNER_USER}:${RUNNER_GROUP} /pipes

ENTRYPOINT [ "/usr/bin/tini", "--", "docker-entrypoint.sh" ]
CMD [ "start-runner" ]
