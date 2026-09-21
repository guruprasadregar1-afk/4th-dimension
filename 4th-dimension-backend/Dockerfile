# Multi-stage Dockerfile for NestJS Backend

# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package definition files
COPY package*.json ./
RUN npm ci

# Copy source code and configuration files
COPY . .

# Build the NestJS application
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Run as non-root user for enhanced security
USER node

EXPOSE 4000

CMD ["node", "dist/main.js"]
