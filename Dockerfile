FROM ghcr.io/puppeteer/puppeteer:latest

# Environment variables for Puppeteer inside Docker
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Start the application
CMD ["node", "server.js"]
