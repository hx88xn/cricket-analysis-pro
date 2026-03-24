FROM electronuserland/builder:latest

WORKDIR /app
ENV CI=true

COPY package.json ./
RUN npm install

COPY main.js preload.js ./
COPY src ./src

RUN npm run dist -- --linux deb tar.gz
