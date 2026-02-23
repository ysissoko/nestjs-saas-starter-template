# base stage to have pnpm installed
FROM node:lts-alpine AS base
RUN npm install -g pnpm

# build stage
FROM base AS build
WORKDIR /usr/src/app

# Copy root package.json and workspace configuration
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install ALL dependencies for the project (including dev dependencies for building)
RUN pnpm install -r --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# production stage - much slimmer
FROM node:lts-alpine AS production
# Install pnpm in production stage
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy root package.json and workspace configuration
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install -r --prod --frozen-lockfile

# Copy only the built app
COPY --from=build /usr/src/app/dist ./dist
RUN mkdir -p src/migrations src/database/seeds src/entities src/auth/entities config

# Copy source files needed for migrations (TypeORM CLI needs .ts files for generation)
COPY --from=build /usr/src/app/src/migrations ./src/migrations
COPY --from=build /usr/src/app/src/data-source.ts ./src/data-source.ts
COPY --from=build /usr/src/app/src/database/seeds ./src/database/seeds
COPY --from=build /usr/src/app/src/entities ./src/entities
COPY --from=build /usr/src/app/src/auth/entities ./src/auth/entities
COPY --from=build /usr/src/app/tsconfig*.json ./
COPY --from=build /usr/src/app/config ./config

# Install TypeScript and ts-node for migration commands
RUN npm install -g typescript ts-node tsconfig-paths

# Run from the dist directory
CMD ["node", "dist/main.js"]
