FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends imagemagick \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY server.mjs ./
COPY scripts ./scripts

ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
