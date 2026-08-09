# syntax=docker/dockerfile:1@sha256:87999aa3d42bdc6bea60565083ee17e86d1f3339802f543c0d03998580f9cb89

FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2

RUN apk add --no-cache libc6-compat \
    && corepack enable pnpm \
    && corepack prepare pnpm@11.17.0 --activate

WORKDIR /workspace

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN mkdir -p /pnpm/store /workspace/node_modules /workspace/.next \
    && chown -R node:node /pnpm /workspace

USER node

RUN pnpm fetch --frozen-lockfile --store-dir=/pnpm/store

EXPOSE 3000
