FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install all dependencies (including dev) for building
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code and build
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /usr/src/app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy built application from builder
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["npm", "start"]

