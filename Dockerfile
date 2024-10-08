FROM node:20-slim@sha256:967bab29ecde5d59a6dd781054bf9021eee8116068e1f5cb139750b6bc6a75e9

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
