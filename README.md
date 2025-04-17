# Ace-Bot

Ace Motorsports iRacing Discord bot

Instructions

Clone this repo

Copy samples/config.json to config/config.json

Sample docker-compose.yaml

```yaml
version: "2" 
services: 
  node: 
    image: "node:latest" 
    working_dir: /home/node/app 
    environment: 
      - NODE_ENV=production 
    volumes: 
      - ./Ace-Bot:/home/node/app 
    expose: 
      - "8081" 
    ports:  
      - "8001:8001" 
    command: "npm start" 
```
