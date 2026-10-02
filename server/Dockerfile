FROM node:22-bookworm-slim AS build

WORKDIR /workspace
COPY package*.json ./
COPY server/package*.json server/
RUN npm ci --prefix server
COPY server server
RUN npm --prefix server run prisma:generate
RUN npm --prefix server run build

FROM node:22-bookworm-slim

WORKDIR /app/server
ENV NODE_ENV=production
COPY --from=build /workspace/server/package.json ./package.json
COPY --from=build /workspace/server/node_modules ./node_modules
COPY --from=build /workspace/server/dist ./dist
COPY --from=build /workspace/server/prisma ./prisma

USER node
CMD ["node", "dist/main.js"]
