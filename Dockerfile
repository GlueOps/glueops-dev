FROM node:24-slim AS build

WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install
COPY . .
RUN yarn build

FROM nginx:alpine-slim

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
