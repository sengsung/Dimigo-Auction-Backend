const JWT = require('jsonwebtoken');

const CONF = require('../config');

module.exports = (req, res, next) => {
  const token = req.cookies['Auction_Auth'];
  if (!token) {
    res.json({ status: 401, msg: 'Unauthorized' });
    return;
  }

  JWT.verify(token, CONF.jwt.key, async (err, decoded) => {
    if (!err) {
      req.auth ={
        _id: decoded._id,
        manager: decoded.manager,
      };
      next();
    } else {
      res.json({ status: 401, msg: 'Token has problem' });
    }
  });
};
