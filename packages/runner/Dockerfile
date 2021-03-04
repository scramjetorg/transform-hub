FROM repo.int.scp.ovh/scramjet/nodejs:buster AS builder

WORKDIR /app/

COPY package.json yarn.lock lerna.json ./
RUN yarn install --frozen-lockfile

COPY . ./
RUN yarn install --frozen-lockfile

WORKDIR /app/packages/symbols
RUN yarn build \
    && NO_INSTALL=true LOCAL_PACKAGES=true node ../../scripts/publish.js

WORKDIR /app/packages/model
RUN yarn build \
 && NO_INSTALL=true LOCAL_PACKAGES=true node ../../scripts/publish.js

WORKDIR /app/packages/runner
RUN yarn build \
 && NO_INSTALL=true LOCAL_PACKAGES=true node ../../scripts/publish.js


FROM repo.int.scp.ovh/scramjet/nodejs:buster

RUN groupadd -g 1200 runner \
 && useradd -g 1200 -u 1200 -m -d /app -s /bin/bash runner \
 && mkdir /package \
 && chown runner:runner /package


COPY --chown=runner:runner --from=builder /app/dist /app/

WORKDIR /app/runner
USER runner

RUN yarn install --frozen-lockfile --production \
 && yarn cache clean

CMD [ "node", "index.js" ]