const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const setRoute = require('./routes');

const CONF = require('./config');

const corsOption = {
  origin: CONF.server.allowOrigins,
  credentials: true,
};
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(helmet());
app.use(morgan('combined'));
app.use(cors(corsOption));

setRoute(app);

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    res.send({ status: 400, msg: 'Invalid json type' });
  } else {
    console.log(err);
    res.send({ status: 500 });
  }
});

module.exports = app;
