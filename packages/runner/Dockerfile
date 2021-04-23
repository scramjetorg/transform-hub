FROM repo.int.scp.ovh/scramjet/nodejs:buster AS builder

WORKDIR /app/

COPY package.json yarn.lock lerna.json ./
RUN yarn install --frozen-lockfile

COPY . ./
RUN yarn install --frozen-lockfile

WORKDIR /app/packages/symbols
RUN    yarn build \
    && NO_INSTALL=true LOCAL_PACKAGES=true node ../../scripts/publish.js

WORKDIR /app/packages/model
RUN    yarn build \
    && NO_INSTALL=true LOCAL_PACKAGES=true node ../../scripts/publish.js

WORKDIR /app/packages/logger
RUN yarn build \
    && NO_INSTALL=true LOCAL_PACKAGES=true node ../../scripts/publish.js

WORKDIR /app/packages/runner
RUN    yarn build \
    && NO_INSTALL=true LOCAL_PACKAGES=true node ../../scripts/publish.js

FROM repo.int.scp.ovh/scramjet/nodejs:buster

ENV PACKAGE_DIR=/package \
    PIPES_DIR=/pipes \
    RUNNER_DIR=/app

RUN    apt-get update \
    && apt-get install --no-install-recommends -y gosu \
    && apt-get clean \
    && apt-get autoremove -y \
    && rm -rf \
         /var/lib/apt/* \
         /usr/share/locale \
         /usr/share/doc \
    && groupadd -g 1200 runner \
    && useradd -g 1200 -u 1200 -m -d ${RUNNER_DIR} -s /bin/bash runner \
    && mkdir ${PACKAGE_DIR} ${PIPES_DIR} \
    && chown runner:runner ${PACKAGE_DIR} ${PIPES_DIR}

COPY --chown=runner:runner --from=builder /app/dist /${RUNNER_DIR}/

WORKDIR /${RUNNER_DIR}/runner

RUN    yarn install --frozen-lockfile --production \
    && yarn cache clean \
    && chmod +x ./bin/start-runner.js

COPY ./packages/runner/entrypoint.sh /
ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "start-runner" ]
