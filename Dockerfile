FROM node:26-slim@sha256:0c6375bcc1ee170c22bd04e11b7c1ff9afc3bb16a865a2629308ceb4b72380ff AS build

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

FROM nginx:stable-alpine-slim@sha256:8e907ab5bf2be45c22b6064ff1c3efa58c0269b76b578da342bb66c2cad81655

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
