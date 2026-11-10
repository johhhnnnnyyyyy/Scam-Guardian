# Scam Guardian MVP container. Node 22 + ffmpeg (voice-note conversion). Runs as a non-root user.
# Stage 1 builds the React + Tailwind + shadcn/ui interface into dist/.
FROM node:22-bookworm-slim AS ui
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js ./
COPY ui ./ui
RUN npm run build

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY public ./public
COPY --from=ui /app/dist ./dist
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data SECURE_COOKIES=1
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Secrets (GNANI_API_KEY, LLM_API_KEY, LLM_MODEL, VAPID keys, METRICS_TOKEN) come from the environment, never the image.
CMD ["node", "src/server.js"]
