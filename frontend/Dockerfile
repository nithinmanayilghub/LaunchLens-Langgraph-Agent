FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install packages
RUN npm install

# Copy source code
COPY . .

# Expose Vite development port
EXPOSE 5173

# Run Vite dev server, forcing host binding so it's accessible from the host browser
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
