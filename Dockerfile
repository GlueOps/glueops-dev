FROM node:24-slim@sha256:e8e2e91b1378f83c5b2dd15f0247f34110e2fe895f6ca7719dbb780f929368eb AS build

WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install
COPY . .
RUN yarn build

FROM nginx:alpine-slim@sha256:a716a2895ddba4fa7fca05e1003579f76d3d304932781426a211bc72b51f0c4e

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
