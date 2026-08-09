FROM node:22-bookworm-slim AS builder

WORKDIR /build

COPY ./dist ./dist

RUN cd dist && npm install --omit=optional --omit=dev --legacy-peer-deps

FROM node:22-bookworm-slim AS target
ENV NODE_OPTIONS="--unhandled-rejections=warn"

RUN groupadd -g 998 mcpm \
    && useradd -g 998 -u 998 -m -d /opt/mcpm -s /bin/false mcpm

WORKDIR /opt/cpm
COPY --from=builder /build/dist ./dist

RUN npm install --omit=dev -g ./dist/multi-manager

EXPOSE 11000
EXPOSE 11001

USER mcpm
ENTRYPOINT [ "scramjet-cloud-platform-multi-manager" ]
