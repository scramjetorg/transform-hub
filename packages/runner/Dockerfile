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

COPY package.json yarn.lock lerna.json tsconfig.base.json ./

RUN yarn install

COPY packages/types ./packages/types
COPY packages/symbols ./packages/symbols
COPY packages/model ./packages/model
COPY packages/logger ./packages/logger
COPY packages/runner ./packages/runner
COPY scripts ./scripts
COPY bin ./bin
COPY conf ./conf
COPY LICENSE ./

RUN yarn install

WORKDIR /app/packages/symbols
RUN     LOCAL_PACKAGES=true NO_INSTALL=true yarn build
WORKDIR /app/packages/logger
RUN     LOCAL_PACKAGES=true NO_INSTALL=true yarn build
WORKDIR /app/packages/model
RUN     LOCAL_PACKAGES=true NO_INSTALL=true yarn build
WORKDIR /app/packages/runner
RUN     LOCAL_PACKAGES=true NO_INSTALL=true yarn build
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
