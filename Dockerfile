FROM node:26-slim@sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5 AS build

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

FROM nginx:stable-alpine-slim@sha256:e9eaa7298465eab06d618c51556fdcf3fb5061f9ff40bd28ee898fbd7ee7f900

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
