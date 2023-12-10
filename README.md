at server use :

pm2 start server.js --node-args="-r esm" --name microservice

<!-- pm2 start ./gb/server.js --name=microservices -->

or
pm2 start ./server.js --node-args="-r esm" --name microservice

at local dev you must runn from ms:node .\gb\server.js
