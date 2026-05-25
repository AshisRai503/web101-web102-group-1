# ── Frontend Dockerfile (Next.js 16 – task-manager) ──────────────────────────
#
# Builds a production-ready image of the Next.js frontend and serves it
# with the built-in Next.js HTTP server on port 3000.
#
# Used by:
#   • docker-compose (local)
#   • GitHub Actions CI/CD pipeline (.github/workflows/deploy.yml)
#   • DockerHub image: <DOCKERHUB_USERNAME>/fe-taskmanager:latest
#
# Build context: ./task-manager  (set in docker-compose / CI workflow)
# ─────────────────────────────────────────────────────────────────────────────

# Use the official Node.js 20 LTS image on Alpine Linux.
# Alpine keeps the final image size small (~200 MB vs ~900 MB for debian).
FROM node:20-alpine

# Set the working directory inside the container.
# All subsequent COPY / RUN commands operate relative to this path.
WORKDIR /app

# Copy only the package manifests first so Docker can cache the npm install
# layer.  If source files change but package.json does not, this layer is
# reused and `npm install` is skipped on rebuild — saving significant time.
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code into the container.
COPY . .

# Inject the backend API base URL at build time so Next.js can embed it
# into the static bundle.  This must be set before `npm run build` because
# NEXT_PUBLIC_* variables are inlined at compile time, not at runtime.
ENV NEXT_PUBLIC_API_URL=https://be-taskmanager.onrender.com

# Compile the Next.js application into an optimised production build.
# Output is written to .next/ inside the container.
RUN npm run build

# Document that the container listens on port 3000 at runtime.
# This does NOT publish the port — use -p 3000:3000 or docker-compose ports.
EXPOSE 3000

# Start the Next.js production server.
# `npm start` runs `next start` which serves the pre-built .next/ bundle.
CMD ["npm", "start"]