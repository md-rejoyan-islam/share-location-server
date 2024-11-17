FROM node:20-alpine3.19 

WORKDIR /server

RUN npm install -g nodemon

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "dev"] 

EXPOSE 5005