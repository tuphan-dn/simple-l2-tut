FROM node:20.12.0-slim AS base
WORKDIR /app

# ===============================
# Builder
# ===============================
FROM base AS builder
# Install deps
RUN npm install -g pnpm@8.15.6
COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile
# Build source
COPY . .
RUN pnpm build
# Remove dev deps
RUN pnpm prune --prod

# ===============================
# Runner
# ===============================
FROM base AS runner
WORKDIR /app
# Get source
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
# Config workspace
EXPOSE 8000
# Run
CMD [ "npm", "start" ]
