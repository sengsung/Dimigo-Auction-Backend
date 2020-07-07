const { needAuth } = require('../middlewares');

module.exports = (app) => {
  app.use('/auth', require('./auth'));
  app.use('/auctions', needAuth, require('./auctions'));
};
