FROM node:14.15.4-alpine3.10

RUN addgroup runnerg -g 902 && adduser -D -u 903 runner runnerg

USER runner

COPY --chown=runner:runnerg ./docker-tmp/ /home/runner

WORKDIR /home/runner/src/runner

RUN npm ci

ENTRYPOINT ["npm", "start"]
