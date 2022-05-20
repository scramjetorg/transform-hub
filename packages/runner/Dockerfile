FROM node:lts-bullseye-slim AS target

ENV PACKAGE_DIR=/package \
    HUB_DIR=/opt/transform-hub

RUN groupadd -g 1200 runner \
    && useradd -g 1200 -u 1200 -m -d ${HUB_DIR} -s /bin/false runner \
    && mkdir -p ${PACKAGE_DIR} \
    && chown runner:runner ${PACKAGE_DIR}

RUN apt-get update \
    && apt-get install -y gosu tini --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*


FROM node:lts-bullseye-slim AS builder

WORKDIR /app/

COPY package.json yarn.lock lerna.json tsconfig.base.json LICENSE ./

RUN yarn install --ignore-engines  --frozen-lockfile --silent

COPY packages/types ./packages/types
COPY packages/utility ./packages/utility
COPY packages/symbols ./packages/symbols
COPY packages/obj-logger ./packages/obj-logger
COPY packages/logger ./packages/logger
COPY packages/model ./packages/model
COPY packages/runner ./packages/runner
COPY scripts ./scripts

RUN yarn install --ignore-engines  --frozen-lockfile --silent

RUN LOCAL_PACKAGES=true NO_INSTALL=true yarn build:packages

FROM target

COPY --from=builder /app/dist ${HUB_DIR}

WORKDIR ${HUB_DIR}/runner

RUN yarn install --ignore-engines  --frozen-lockfile --production --silent \
    && yarn cache clean \
    && chmod +x ./bin/start-runner.js

COPY ./packages/runner/docker-entrypoint.sh /usr/local/bin/
COPY ./packages/runner/unpack.sh /usr/local/bin/
COPY ./packages/runner/wait-for-sequence-and-start.sh /usr/local/bin/

ENTRYPOINT [ "/usr/bin/tini", "--", "docker-entrypoint.sh" ]
CMD [ "start-runner" ]

