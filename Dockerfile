FROM node:22-slim@sha256:2f3571619daafc6b53232ebf2fcc0817c1e64795e92de317c1684a915d13f1a5

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
