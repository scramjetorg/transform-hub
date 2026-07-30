# Python runtime image whose actual ENTRYPOINT is the outer Node-based
# packages/runner. The outer runner is what starts inside the container;
# it then spawns the runner-python wrapper (python3 -m runner_python ...)
# which is also baked in here together with its Python dependencies.
#
# Build context must be the repository root, e.g.:
#   docker build -f packages/runner-python/Dockerfile -t scramjetorg/runner-py:dev .
#
# Prerequisite: packages/runner's `prebuild:docker` has staged the outer
# runner JS tree at ./dist/docker-runner/ (same input the outer
# packages/runner/Dockerfile consumes).

FROM python:3.9-slim-bullseye AS target

ENV PACKAGE_DIR=/package \
    HUB_DIR=/opt/transform-hub \
    RUNNER_PY_DIR=/opt/runner-python \
    RUNNER_USER=runner \
    RUNNER_GROUP=runner \
    NODE_MAJOR=22

ENV PYTHONPATH="${RUNNER_PY_DIR}:${PACKAGE_DIR}/__pypackages__" \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN groupadd -g 1200 ${RUNNER_GROUP} \
    && useradd -g 1200 -u 1200 -m -d ${HUB_DIR} -s /bin/false ${RUNNER_USER} \
    && mkdir -p ${PACKAGE_DIR} \
    && chown ${RUNNER_USER}:${RUNNER_GROUP} ${PACKAGE_DIR}

# System packages: git + gosu + tini are required by the outer runner's
# boot scripts; curl/ca-certificates/gnupg are needed to add the NodeSource
# repository and fetch Node.js (the outer runner is Node-based).
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

# ---------------------------------------------------------------------------
# Stage 2: prepare the outer runner JS tree (mirrors packages/runner/Dockerfile)
# ---------------------------------------------------------------------------
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
COPY ./dist/docker-runner/runner-python ./dist/runner-python
COPY ./dist/docker-runner/api-server ./dist/api-server

# ---------------------------------------------------------------------------
# Final image
# ---------------------------------------------------------------------------
FROM target

# Outer Node-based runner lives under ${HUB_DIR}/runner so that the
# workdir-relative `node bin/start-runner` in docker-entrypoint.sh resolves.
COPY --from=builder /app/dist ${HUB_DIR}

WORKDIR ${HUB_DIR}/runner

RUN yarn install --ignore-engines --frozen-lockfile --production --silent \
    && yarn cache clean \
    && chmod +x ./bin/start-runner.js

# Python wrapper sources + dependencies. The outer runner spawns this via
# `python3 -m runner_python <bootConfigPath>` (see packages/runner-python/README.md).
# We do NOT copy packages/python-runner/runner.py - that legacy runner is
# intentionally excluded; this image hosts the new runner-python wrapper.
#
# The verser2 guest Python wheel is a run-time dependency imported by
# runner_python/verser2_runtime.py.  Local development resolves it via
# install-deps.sh; here we download the exact same public release asset
# and verify its SHA-256 before installing, so the image is self-contained.
COPY packages/runner-python/scripts/verser2-config.sh /tmp/verser2-config.sh
COPY packages/runner-python/requirements.txt ${RUNNER_PY_DIR}/requirements.txt
RUN set -eux \
    && . /tmp/verser2-config.sh \
    && TMP_DIR="$(mktemp -d)" \
    && python3 -c "
import sys
from pathlib import Path
from urllib.request import urlopen
url, dst = sys.argv[1], Path(sys.argv[2])
dst.write_bytes(urlopen(url).read())
" "${VERSER2_WHEEL_URL}" "${TMP_DIR}/${VERSER2_WHEEL}" \
    && echo "${VERSER2_WHEEL_SHA256}  ${TMP_DIR}/${VERSER2_WHEEL}" \
        | sha256sum --check --status \
    && pip install --no-cache-dir \
        -r ${RUNNER_PY_DIR}/requirements.txt \
        "${TMP_DIR}/${VERSER2_WHEEL}" \
    && rm -rf "${TMP_DIR}" /tmp/verser2-config.sh

COPY packages/runner-python/runner_python ${RUNNER_PY_DIR}/runner_python
COPY packages/runner-python/src          ${RUNNER_PY_DIR}/src
COPY packages/runner-python/pyproject.toml ${RUNNER_PY_DIR}/pyproject.toml

RUN chown -R ${RUNNER_USER}:${RUNNER_GROUP} ${RUNNER_PY_DIR}

# Boot scripts: use the OUTER runner's scripts (packages/runner/*.sh) since
# the outer runner is what tini actually launches. The python-runner boot
# scripts are intentionally NOT used here.
COPY ./packages/runner/docker-entrypoint.sh /usr/local/bin/
COPY ./packages/runner/unpack.sh /usr/local/bin/
COPY ./packages/runner/wait-for-sequence-and-start.sh /usr/local/bin/

RUN mkdir /pipes \
    && chown ${RUNNER_USER}:${RUNNER_GROUP} /pipes

ENTRYPOINT [ "/usr/bin/tini", "--", "docker-entrypoint.sh" ]
CMD [ "start-runner" ]
