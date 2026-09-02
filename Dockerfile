FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/server/package*.json apps/server/
COPY apps/desktop/package*.json apps/desktop/
RUN npm ci
COPY tsconfig.base.json ./
COPY apps/server apps/server
RUN npm run build -w @remote/server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/node_modules/ws ./node_modules/ws
COPY apps/server/package.json ./package.json
EXPOSE 8787
CMD ["node", "dist/index.js"]
