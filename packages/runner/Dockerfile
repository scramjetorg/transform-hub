FROM node:14.15.4-alpine3.10

RUN addgroup runnerg -g 902 && adduser -D -u 903 runner runnerg

USER runner

COPY --chown=runner:runnerg ./docker-tmp /home/app

WORKDIR /home/app/runner

RUN npm i --no-package-lock

ENTRYPOINT ["node", "index.js"]
