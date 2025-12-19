const express = require('express');
const {
  makePayment,
  getPaymentHistory,
  getPaymentsByGroup
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPaymentHistory)
  .post(makePayment);

router.get('/group/:groupId', getPaymentsByGroup);

module.exports = router;