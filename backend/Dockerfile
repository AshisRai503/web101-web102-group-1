FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install pg
COPY . .
EXPOSE 5000
CMD ["npm", "start"]