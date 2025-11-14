FROM node:22-slim@sha256:8833056542b4e17c27154beeabbc27c3e14ddfe3fb9183f43b3adf7eb0462923

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
