FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY core/package.json ./core/
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile

# Copy source, generate Prisma client, and build client
COPY . .
RUN cd server && bunx prisma generate
RUN cd client && bun run build

# Production image
FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
COPY core/package.json ./core/
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile

COPY core ./core
COPY server ./server

# Copy built client into server/public so Express can serve it
COPY --from=builder /app/client/dist ./server/public

WORKDIR /app/server

ENV NODE_ENV=production

CMD ["sh", "start.sh"]
