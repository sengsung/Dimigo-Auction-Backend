const { Router } = require('express');
const controller = require('../controllers/auth');

const router = Router();

router.post('/authorize', controller.authorize);
router.post('/revoke', controller.revoke);

module.exports = router;
