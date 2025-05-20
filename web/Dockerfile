FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm install @mui/material @emotion/react @emotion/styled

EXPOSE 3000

CMD ["npm", "start"] 