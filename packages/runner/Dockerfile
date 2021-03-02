FROM repo.int.scp.ovh/scramjet/nodejs:buster AS builder

WORKDIR /app/build

COPY package.json yarn.lock lerna.json ./

RUN yarn install --frozen-lockfile

COPY . ./

RUN yarn install --frozen-lockfile

RUN set -ex \
 && cd packages/model \
 && yarn build \
 && NO_INSTALL=true OUT_DIR=dist LOCAL_PKGS=true node ../../scripts/publish.js \
 && cd ../runner \
 && yarn build \
 && NO_INSTALL=true OUT_DIR=dist LOCAL_PKGS=true node ../../scripts/publish.js \
 && cd ../symbols \
 && yarn build \
 && NO_INSTALL=true OUT_DIR=dist LOCAL_PKGS=true node ../../scripts/publish.js

FROM repo.int.scp.ovh/scramjet/nodejs:buster

RUN groupadd -g 1200 runner \
 && useradd -g 1200 -u 1200 -m -d /app -s /bin/bash runner

COPY --chown=runner:runner --from=builder /app/build/dist /app/

WORKDIR /app/runner
USER runner

RUN set -ex \
 && cd ../model \
 && npm install --no-package-lock /app/symbols \
 && npm install --no-package-lock \
 && cd ../runner \
 && npm install --no-package-lock /app/model \
 && npm install --no-package-lock

CMD ["node", "index.js"]