FROM node:lts-bullseye-slim

ENV PACKAGE_DIR=/package \
    HUB_DIR=/opt/transform-hub

RUN groupadd -g 1200 prerunner \
    && useradd -g 1200 -u 1200 -m -d ${HUB_DIR} -s /bin/false prerunner \
    && mkdir -p ${PACKAGE_DIR} \
    && chown prerunner:prerunner ${PACKAGE_DIR}

RUN apt-get update \
    && apt-get install -y jq --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR ${HUB_DIR}

COPY ./env.sh .
COPY ./unpack.sh .
COPY ./permissions.sh .
COPY ./identify.sh .
COPY ./unpack-identify.sh .


USER prerunner
CMD [ "./unpack-identify.sh" ]
