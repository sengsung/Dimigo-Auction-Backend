const { Router } = require('express');
const controller = require('../controllers/users');

const router = Router();

router.get('/me', controller.me);

module.exports = router;
