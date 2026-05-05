FROM node:20-bookworm-slim

WORKDIR /app

# Prisma engine requires OpenSSL runtime libraries.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

# Run migrations then start dev server
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
