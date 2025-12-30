FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Start NestJS in watch mode
CMD ["npm", "run", "start:dev"]

