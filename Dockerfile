FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production HOST=0.0.0.0
EXPOSE 4173

CMD ["node", "server.mjs"]
