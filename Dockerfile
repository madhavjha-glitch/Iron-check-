# ---------------------------------------------------------
# AWS / CLOUD RUN CONTAINER PRODUCTION BUILD DOCKERFILE
# ---------------------------------------------------------

# Stage 1: Build the client assets and compile backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency structures
COPY package*.json ./
RUN npm ci

# Copy core codebase
COPY . .

# Build Vite static assets & Bundle TypeScript Entry Server into dist/server.cjs
RUN npm run build

# Stage 2: Clean execution deployment environment
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Hardcoded network proxy port compliance
ENV PORT=3000

# Copy output build distributions directly
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies for performance
RUN npm ci --only=production

# Expose port (Nginx reverse-proxy ingress routes exclusively through 3000)
EXPOSE 3000

# Execute server bundle
CMD ["node", "dist/server.cjs"]
