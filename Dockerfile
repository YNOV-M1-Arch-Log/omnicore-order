# ── Builder ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Root workspace metadata
COPY package.json package-lock.json ./

# Workspace package.json files (required for npm ci to resolve the workspace graph)
COPY omnicore-db/package.json      ./omnicore-db/package.json
COPY omnicore-auth/package.json    ./omnicore-auth/package.json
COPY omnicore-user/package.json    ./omnicore-user/package.json
COPY omnicore-product/package.json ./omnicore-product/package.json
COPY omnicore-gateway/package.json ./omnicore-gateway/package.json
COPY omnicore-order/package.json   ./omnicore-order/package.json

# Shared DB package — contains schema + migrations + Prisma client source
COPY omnicore-db/ ./omnicore-db/

# Install all deps (devDeps included so prisma CLI is available for generate)
RUN npm ci && npm cache clean --force

# Generate Prisma client into root node_modules/@prisma/client
RUN cd omnicore-db && npx prisma generate

# Prune devDependencies for a lean production image
RUN npm prune --omit=dev

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Pruned node_modules (workspace symlinks resolved to real directories by Docker COPY)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Shared DB package (needed to resolve node_modules/@omnicore/db symlink → ../../omnicore-db)
COPY --chown=nodejs:nodejs omnicore-db/ ./omnicore-db/

# Service source code
COPY --chown=nodejs:nodejs omnicore-order/ ./omnicore-order/

USER nodejs

WORKDIR /app/omnicore-order

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "start"]
