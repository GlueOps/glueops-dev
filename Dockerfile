FROM node:20-slim@sha256:8d5c168087c841ac367468f77935aa78eff3195b48bf9eb05cbc761e6b9db507

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
