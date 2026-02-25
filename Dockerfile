FROM node:24-slim@sha256:61bf992754b4ab288d41cb92c25392195d0035871b4723a0abd30a49dcba356c

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
