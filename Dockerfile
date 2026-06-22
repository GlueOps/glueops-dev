FROM node:24-slim@sha256:242549cd46785b480c832479a730f4f2a20865d61ea2e404fdb2a5c3d3b73ecf AS build

WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install
COPY . .
ARG BUILD_BRANCH=""
ARG BUILD_TAG=""
ARG BUILD_SHA=""
ARG BUILD_TIMESTAMP=""
ENV REACT_APP_BUILD_BRANCH=$BUILD_BRANCH
ENV REACT_APP_BUILD_TAG=$BUILD_TAG
ENV REACT_APP_BUILD_SHA=$BUILD_SHA
ENV REACT_APP_BUILD_TIMESTAMP=$BUILD_TIMESTAMP
RUN yarn build

FROM nginx:alpine-slim@sha256:ef9984ffb35887404165e7060a4c7d059260c798b9912f48e6d3e236f6ec24a7

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
