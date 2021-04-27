FROM repo.int.scp.ovh/scramjet/nodejs:buster as target

ENV PACKAGE_DIR=/package \
    PIPES_DIR=/pipes \
    RUNNER_DIR=/app

ADD https://repo.int.scp.ovh/repository/storage/bin/gosu/1.12/gosu-amd64 /usr/local/bin/gosu

RUN    set -x \
    && chmod +x /usr/local/bin/gosu \
    && groupadd -g 1200 runner \
    && useradd -g 1200 -u 1200 -m -d ${RUNNER_DIR} -s /bin/bash runner \
    && mkdir ${PACKAGE_DIR} ${PIPES_DIR} \
    && chown runner:runner ${PACKAGE_DIR} ${PIPES_DIR}

FROM repo.int.scp.ovh/scramjet/nodejs:buster AS builder

WORKDIR /app/


ADD packages/types ./packages/types
ADD packages/symbols ./packages/symbols
ADD packages/model ./packages/model
ADD packages/logger ./packages/logger
ADD packages/runner ./packages/runner
ADD scripts ./scripts
ADD bin ./bin
ADD conf ./conf
ADD LICENSE package.json yarn.lock lerna.json tsconfig.base.json ./

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

FROM target

ENV PACKAGE_DIR=/package \
    PIPES_DIR=/pipes \
    RUNNER_DIR=/app

COPY --chown=runner:runner --from=builder /app/dist /${RUNNER_DIR}/

WORKDIR /${RUNNER_DIR}/runner

RUN    yarn install --frozen-lockfile --production \
    && yarn cache clean \
    && chmod +x ./bin/start-runner.js

COPY ./packages/runner/entrypoint.sh /
ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "start-runner" ]
