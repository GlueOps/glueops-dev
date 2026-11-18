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

FROM nginx:alpine-slim@sha256:48b732c48cc06989f5599f4a1922990051f82b623c84feeff3836ef2b23884cb

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
