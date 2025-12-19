const express = require('express');
const {
  register,
  login,
  verifyEmail,
  getMe,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);

router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;