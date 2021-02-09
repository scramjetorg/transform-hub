FROM alpine:3.13
LABEL maintainer="pf@scramjet.org"

RUN apk add --no-cache jq unzip gzip

COPY ./entrypoint.sh /
ENTRYPOINT ["sh", "/entrypoint.sh"]
