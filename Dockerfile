# syntax=docker/dockerfile:1
# Works with Docker and Podman. Images are fully qualified so Podman never
# has to guess the registry.

FROM docker.io/library/node:24-alpine AS build
WORKDIR /app
# The site build does not need the Cypress binary.
ENV CYPRESS_INSTALL_BINARY=0 \
    ASTRO_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG BASE_PATH=/
ARG SITE_URL=http://localhost:8080
ARG PUBLIC_REPO_URL=
ENV BASE_PATH=$BASE_PATH SITE_URL=$SITE_URL PUBLIC_REPO_URL=$PUBLIC_REPO_URL
RUN npm run build

FROM docker.io/library/nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
