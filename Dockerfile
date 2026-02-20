FROM node:24-slim@sha256:a81a03dd965b4052269a57fac857004022b522a4bf06e7a739e25e18bce45af2

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 80

ENTRYPOINT yarn build && yarn serve --port 80 --host 0.0.0.0
