FROM node:20.12.0-slim
WORKDIR /app
# Install deps
RUN npm install -g pnpm@8.15.6
COPY . .
RUN pnpm install --frozen-lockfile
# Config workspace
EXPOSE 8000
# Run
CMD [ "pnpm", "dev" ]
