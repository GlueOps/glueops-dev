FROM node:20-slim@sha256:ae54182fb22d5e567440c9a27d2f4f856f630e5159390af1f69ab0b5e58f6d66

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
