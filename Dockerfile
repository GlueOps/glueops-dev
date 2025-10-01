FROM node:22-slim@sha256:d943bf20249f8b92eff6f605362df2ee9cf2d6ce2ea771a8886e126ec8714f08

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
