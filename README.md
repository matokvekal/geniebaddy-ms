at server use :

nano .env
copy all env

pm2 start ./gb/index.js --name service

pm2 save
new try :start:gb and start:ai




pm2 start ./ai/index.js --name ai

//////////////////////local////////////////
npm run install:services


npm run start:local