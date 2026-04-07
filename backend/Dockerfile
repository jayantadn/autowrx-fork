# Stage 1: Build Frontend using build-frontend.sh script
# Use BUILDPLATFORM for frontend builder since it produces architecture-agnostic static files
FROM --platform=$BUILDPLATFORM node:24.12.0-alpine AS frontend-builder
WORKDIR /app

# Disable Husky git hooks and browser-opening behavior during Docker build
ENV HUSKY=0 \
	CI=true

# Install bash (needed for build script)
# Use --no-scripts to avoid QEMU emulation issues with post-install scripts
# The bash binary will still work even without post-install scripts
RUN apk add --no-cache --no-scripts bash

# Enable corepack and install yarn
RUN corepack enable && corepack prepare yarn@1.22.19 --activate

# Create backend/static directory structure for build output
# This ensures backend/static exists before building frontend
RUN mkdir -p backend/static

# Copy frontend source code
COPY frontend/ ./frontend/

# Copy build script
COPY build-frontend.sh ./

# Install frontend dependencies and build
# The script will build into backend/static/frontend-dist/
RUN chmod +x build-frontend.sh && ./build-frontend.sh

# Stage 2: Build Backend (only backend code, no frontend source)
FROM node:24.12.0-alpine

ENV HUSKY=0

# Install Python and build tools needed for native dependencies (bufferutil, utf-8-validate)
RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare yarn@1.22.19 --activate

RUN mkdir -p /usr/src/playground-be && chown -R node:node /usr/src/playground-be

WORKDIR /usr/src/playground-be

COPY backend/package.json backend/yarn.lock ./

RUN yarn install --frozen-lockfile --production

# Remove build tools to reduce image size (optional, but keeps python3 for runtime if needed)
RUN apk del make g++

COPY --chown=node:node backend/ .

# Create data directory for VSS files (will be populated by setupScheduledCheck on startup)
# This ensures the directory exists even if files haven't been downloaded yet
RUN mkdir -p data && chown -R node:node data

# Copy frontend build into backend static folder
COPY --from=frontend-builder --chown=node:node /app/backend/static/frontend-dist ./static/frontend-dist

# Copy static files (builtin-widgets, images, plugin samples) from the build context
COPY --chown=node:node backend/static/builtin-widgets ./static/builtin-widgets
COPY --chown=node:node backend/static/images ./static/images
COPY --chown=node:node backend/static/global.css ./static/global.css
COPY --chown=node:node backend/static/plugin ./static/plugin

# Copy default config files (home_content.json, etc.)
COPY --chown=node:node backend/default ./default

USER node

EXPOSE 3200

ENV PORT=3200

CMD ["yarn", "prod:test"]
