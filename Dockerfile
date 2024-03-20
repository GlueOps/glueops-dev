FROM node:18-slim@sha256:246bf34b0c7cf8d9ff7cbe0c1ff44b178051f06c432c8e7df1645f1bd20b0352

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
