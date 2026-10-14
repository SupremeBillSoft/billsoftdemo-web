# --- Stage 1: Build Frontend ---
FROM node:22-alpine AS builder

# pnpm pinned to the version that wrote pnpm-lock.yaml (latest may differ)
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# .dockerignore keeps node_modules, dist and the local .env out
COPY . .

# Same-origin API: nginx forwards /api to the backend container
ENV VITE_API_BASE_URL=/api
RUN pnpm build

# --- Stage 2: Production Nginx Runner ---
FROM nginx:alpine AS runner

# Remove default Nginx site configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy compiled SPA assets and custom Nginx config
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4000

CMD ["nginx", "-g", "daemon off;"]
