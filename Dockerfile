FROM node:22-alpine

WORKDIR /app

# Copy only server files (not frontend)
COPY package*.json ./
COPY server/ ./server/

# Install server dependencies only (skip devDependencies)
RUN npm ci --omit=dev

# Expose port (Railway will assign the actual port)
EXPOSE 3000

# Start the server
CMD ["node", "server/api.js"]
