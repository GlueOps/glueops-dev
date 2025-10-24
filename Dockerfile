FROM node:22-slim@sha256:f9f7f95dcf1f007b007c4dcd44ea8f7773f931b71dc79d57c216e731c87a090b

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
