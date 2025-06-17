FROM node:22-alpine

WORKDIR /app
# Copy package.json and package-lock.json first to leverage Docker cache

COPY ./package*.json ./

RUN npm run build

# Install dependencies
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "dist/server.js"]