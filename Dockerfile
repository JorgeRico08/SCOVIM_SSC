# =========================
# BUILD STAGE
# =========================
FROM node:20-bullseye-slim AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# =========================
# PRODUCTION STAGE
# =========================
FROM node:20-bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=es_MX.UTF-8
ENV LC_ALL=es_MX.UTF-8
ENV TZ=America/Mexico_City
ENV NODE_ENV=production
ENV PORT=3000
ENV FFMPEG_PATH=/usr/bin/ffmpeg

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    locales \
    tzdata \
    ca-certificates \
    && sed -i 's/# es_MX.UTF-8 UTF-8/es_MX.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -ms /bin/bash -u 10001 nodeuser

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/views ./dist/views
COPY --from=build /app/src/public ./dist/public

RUN chown -R nodeuser:nodeuser /app

USER nodeuser

EXPOSE 3000

CMD ["node", "dist/server.js"]