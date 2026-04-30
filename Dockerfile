FROM node:20-bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=es_MX.UTF-8
ENV LC_ALL=es_MX.UTF-8
ENV TZ=America/Mexico_City
ENV NODE_ENV=production
ENV PORT=3000
ENV CONVERT_CONCURRENCY=1
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Paquetes del sistema + FFmpeg + locales
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    locales \
    tzdata \
    ca-certificates \
    && sed -i 's/# es_MX.UTF-8 UTF-8/es_MX.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen \
    && rm -rf /var/lib/apt/lists/*

# Usuario no-root
RUN useradd -ms /bin/bash -u 10001 nodeuser

WORKDIR /app

RUN mkdir -p /tmp/lo-profile \
    && chown -R nodeuser:nodeuser /app /tmp

COPY --chown=nodeuser:nodeuser package*.json ./

# Instala todas las deps para poder compilar TS
RUN npm ci

COPY --chown=nodeuser:nodeuser . .

# Compila TypeScript
RUN npm run build

# Borra devDependencies después del build
RUN npm prune --omit=dev

USER nodeuser

EXPOSE 3000

CMD ["node","dist/server.js"]
