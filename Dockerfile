FROM node:22-slim@sha256:d6d1b3a6f21a25e43d765816281b4a86e5f1ebf843cfae1b14dd0f1c28257cc7

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
