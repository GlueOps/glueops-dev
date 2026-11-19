FROM node:26-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS build

WORKDIR /app
COPY package.json package-lock.json ./
# Install the npm that package.json pins (volta.npm), not the one bundled with the base image.
RUN npm install -g --no-audit --no-fund "npm@$(node -p "require('./package.json').volta.npm")"
RUN npm ci
COPY . .
ARG BUILD_BRANCH=""
ARG BUILD_TAG=""
ARG BUILD_SHA=""
ARG BUILD_TIMESTAMP=""
ENV REACT_APP_BUILD_BRANCH=$BUILD_BRANCH
ENV REACT_APP_BUILD_TAG=$BUILD_TAG
ENV REACT_APP_BUILD_SHA=$BUILD_SHA
ENV REACT_APP_BUILD_TIMESTAMP=$BUILD_TIMESTAMP
RUN npm run build

FROM nginx:stable-alpine-slim@sha256:8c950211a641ec5b23f265450517001f6bcca533666120ebe36cb4cff3d00a55

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
