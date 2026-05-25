# ── Backend Dockerfile (Express.js API) ──────────────────────────────────────
#
# Builds a production-ready image of the Node.js/Express backend and starts
# the HTTP server on port 5000.
#
# Used by:
#   • docker-compose (local)
#   • GitHub Actions CI/CD pipeline (.github/workflows/deploy.yml)
#   • DockerHub image: <DOCKERHUB_USERNAME>/be-taskmanager:latest
#
# Build context: ./backend  (set in docker-compose / CI workflow)
# ─────────────────────────────────────────────────────────────────────────────

# Use the official Node.js 18 LTS image on Alpine Linux.
# Node 18 is the current LTS at the time of writing; Alpine keeps the
# final image footprint small.
FROM node:18-alpine

# Set the working directory inside the container.
WORKDIR /app

# Copy package manifests first to leverage Docker's layer cache.
# `npm install` only re-runs when package.json or package-lock.json change.
COPY package*.json ./
RUN npm install

# Install the PostgreSQL client library separately.
# `pg` is listed as a dependency in package.json, but this explicit install
# step ensures the native bindings are compiled correctly for the Alpine
# Linux environment inside the container.
RUN npm install pg

# Copy the rest of the application source (src/, migrations/, .env, etc.)
# into the container after dependencies are installed.
COPY . .

# Document that the Express server listens on port 5000 at runtime.
EXPOSE 5000

# Start the Express server using the `start` script defined in package.json
# (`node src/server.js`).  nodemon is NOT used in production.
CMD ["npm", "start"]