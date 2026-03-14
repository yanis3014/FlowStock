# Build depuis la racine du monorepo
FROM node:20-alpine AS builder
WORKDIR /app

# Copier le monorepo (nécessaire pour npm workspaces)
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

# URL de l'API (le navigateur y accède via localhost:3000)
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm ci
# Builder @bmad/shared d'abord pour que dist/ contienne les types (ex. Recipe)
RUN npm run build --workspace=@bmad/shared
RUN npm run build --workspace=@bmad/web

# Stage production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3002
ENV HOSTNAME="0.0.0.0"

WORKDIR /app/apps/web
CMD ["node", "server.js"]
