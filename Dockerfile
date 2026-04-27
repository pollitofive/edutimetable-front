FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install -g npm@11.13.0 && rm -f package-lock.json && npm install

EXPOSE 3537

CMD ["npm", "run", "dev"]
