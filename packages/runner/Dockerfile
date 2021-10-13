FROM node:lts-bullseye-slim AS target

ENV PACKAGE_DIR=/package \
    FIFOS_DIR=/pipes \
    HUB_DIR=/opt/transform-hub

RUN groupadd -g 1200 runner \
    && useradd -g 1200 -u 1200 -m -d ${HUB_DIR} -s /bin/bash runner \
    && mkdir -p ${PACKAGE_DIR} ${FIFOS_DIR} \
    && chown runner:runner ${PACKAGE_DIR} ${FIFOS_DIR}

RUN apt-get update \
    && apt-get install -y gosu \
    && rm -rf /var/lib/apt/lists/*;
   

FROM node:lts-bullseye-slim AS builder

WORKDIR /app/

COPY package.json yarn.lock lerna.json tsconfig.base.json LICENSE ./

RUN yarn install --frozen-lockfile --silent

COPY packages/types ./packages/types
COPY packages/utility ./packages/utility
COPY packages/symbols ./packages/symbols
COPY packages/logger ./packages/logger
COPY packages/model ./packages/model
COPY packages/runner ./packages/runner
COPY scripts ./scripts

RUN yarn install --frozen-lockfile --silent

RUN LOCAL_PACKAGES=true NO_INSTALL=true yarn build:packages

FROM target

COPY --chown=runner:runner --from=builder /app/dist ${HUB_DIR}

WORKDIR ${HUB_DIR}/runner

RUN yarn install --frozen-lockfile --production --silent \
    && yarn cache clean \
    && chmod +x ./bin/start-runner.js

COPY ./packages/runner/entrypoint.sh /
ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "start-runner" ]
