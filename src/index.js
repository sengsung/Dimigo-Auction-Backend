const { createServer } = require('http');

const CONF = require('./config');
const DB = require('./db');

const appWeb = require('./app-web');
const { listenIO } = require('./app-socket');

DB.connect(() => {
  const httpServer = createServer(appWeb);

  httpServer.listen(CONF.server.port, () => {
    console.log(`Web Server Start ${CONF.server.port}`);
  });

  listenIO(httpServer);
});
