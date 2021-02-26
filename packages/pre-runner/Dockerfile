FROM alpine:3.13
LABEL maintainer="pf@scramjet.org"

COPY ./unpack-identify.sh /
RUN apk add --no-cache jq unzip gzip && \
    chmod +x /unpack-identify.sh
