# --- Stage 1: Build the Application ---
# We use a full Node.js image to build the app
FROM node:18 AS builder
WORKDIR /app

# Copy dependency lists
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Run the production build command
RUN npm run build

# --- Stage 2: Run the Application ---
# We use a smaller Node.js image to run the app
FROM node:18

WORKDIR /app

# Copy the necessary files from the 'builder' stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# The Next.js server runs on port 3000
EXPOSE 3000

# The command to start the production server
CMD ["npm", "run", "start"]