FROM node:24-slim@sha256:5f5788dfb37df047dddb2e5a6d7544d2fcc994408284518e6fc31edf5233585a

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
