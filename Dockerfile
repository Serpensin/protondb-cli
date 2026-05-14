# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json npm-shrinkwrap.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:20-alpine

LABEL maintainer="Javier Galarza <jegj57@gmail.com>"

RUN apk update && apk upgrade && rm -rf /var/apk/cache/*

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV NODE_ENV=production

WORKDIR /app
COPY package.json npm-shrinkwrap.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=builder /app/dist ./dist

ENTRYPOINT ["node", "dist/protondb-cli.js"]
