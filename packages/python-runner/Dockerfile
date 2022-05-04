FROM python:3.9-slim-bullseye

ENV PACKAGE_DIR=/package \
    HUB_DIR=/opt/transform-hub

ENV PYTHONPATH "${PYTHONPATH}:${PACKAGE_DIR}/__pypackages__"

RUN groupadd -g 1200 runner \
    && useradd -g 1200 -u 1200 -m -d ${HUB_DIR} -s /bin/false runner \
    && mkdir -p ${PACKAGE_DIR} \
    && chown runner:runner ${PACKAGE_DIR}

RUN apt-get update \
    && apt-get install -y git gosu tini --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY packages/python-runner/*.py ./
COPY packages/python-runner/requirements.txt ./requirements.txt
COPY packages/python-runner/docker-entrypoint.sh /usr/local/bin/
COPY packages/runner/unpack.sh /usr/local/bin/
COPY packages/runner/wait-for-sequence-and-start.sh /usr/local/bin/

RUN pip install -r requirements.txt

ENTRYPOINT [ "/usr/bin/tini", "--", "docker-entrypoint.sh" ]
CMD [ "start-runner" ]

