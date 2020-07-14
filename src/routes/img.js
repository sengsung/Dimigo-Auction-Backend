const { static } = require('express');
const { Router } = require('express');
const controller = require('../controllers/users');

const router = Router();

router.use(static(`${__dirname}/../static/img`));
router.use((req, res) => {
  res.status(404).end();
});

module.exports = router;
