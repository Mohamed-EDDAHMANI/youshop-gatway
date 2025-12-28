FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Start NestJS in watch mode
CMD ["npm", "run", "start:dev"]
