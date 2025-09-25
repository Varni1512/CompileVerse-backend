FROM node:20

# Install OpenJDK (Java Development Kit) and Python3
RUN apt-get update && apt-get install -y openjdk-17-jdk python3

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8000

CMD ["node", "index.js"]
