const express = require('express');
const {
  searchUsers,
  getBalanceSummary
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/search', searchUsers);
router.get('/balance', getBalanceSummary);

module.exports = router;