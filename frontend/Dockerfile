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

# React Router SPA fallback
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD [\"nginx\", \"-g\", \"daemon off;\"]