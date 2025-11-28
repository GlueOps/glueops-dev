FROM node:22-slim@sha256:330fc735268c38d88788c3469a8dff2d0ad834af58569a42c61c47e4578d953b

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
