FROM node:24-slim@sha256:f752e4821362614eab35016f01dea3af61d2f59d0445381c25683e4331520a7b

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
