# Stage 1: Builder
# - Compiles TS Server
# - Builds Next.js Client
FROM node:20-alpine AS builder

WORKDIR /app

# Install PNPM
RUN npm install -g pnpm

# Copy Root Files
COPY package.json pnpm-lock.yaml ./

# Install Dependencies
RUN pnpm install --frozen-lockfile

# Copy Source Code
COPY . .

# Build Server
RUN pnpm run build

# Stage 2: Runner
# - Minimal Production Image
FROM node:20-alpine AS runner

WORKDIR /app

# Copy production artifacts from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/out ./client/out

# Environment Configuration
ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

CMD ["node", "dist/server.js"]
