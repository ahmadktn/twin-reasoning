FROM node:22-alpine AS build

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies exactly from lockfile
RUN pnpm install --frozen-lockfile --config.strict-peer-dependencies=false

# Copy app files
COPY . .

# Build app
RUN pnpm build

# Production image
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# React Router SPA fallback and API Reverse Proxy
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:8000/; \
        proxy_set_header Host \$host; \
        proxy_set_header X-Real-IP \$remote_addr; \
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto \$scheme; \
        proxy_buffering off; \
        proxy_cache off; \
        proxy_set_header Connection ''; \
        proxy_http_version 1.1; \
        chunked_transfer_encoding off; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]