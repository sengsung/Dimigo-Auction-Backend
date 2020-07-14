const { needAuth } = require('../middlewares');

module.exports = (app) => {
  app.use('/auth', require('./auth'));
  app.use('/users', needAuth, require('./users'));
  app.use('/auctions', needAuth, require('./auctions'));
  app.use('/img', require('./img'));
};
