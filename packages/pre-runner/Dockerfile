FROM node:lts-buster-slim

RUN groupadd -g 1200 prerunner \
  && useradd -g 1200 -u 1200 -m -d /app -s /bin/bash prerunner \
  && mkdir /package \
  && chown prerunner:prerunner /package

RUN apt-get update \
  && apt-get install -y jq \
  && apt-get clean \
  && rm -rf \
  /var/lib/apt/* \
  /usr/share/locale \
  /usr/share/doc

WORKDIR /app
COPY --chown=prerunner:prerunner ./env.sh .
COPY --chown=prerunner:prerunner ./unpack.sh .
COPY --chown=prerunner:prerunner ./identify.sh .
COPY --chown=prerunner:prerunner ./unpack-identify.sh .
USER prerunner
CMD [ "./unpack-identify.sh" ]
