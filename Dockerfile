FROM node:22-slim@sha256:5f5849e75eea8ced6f8939abfbb2385c66b7d22c663ce9992e614c6004b1db59

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
