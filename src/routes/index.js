const router = require('express').Router();

router.use('/orders', require('./order.routes'));

module.exports = router;
