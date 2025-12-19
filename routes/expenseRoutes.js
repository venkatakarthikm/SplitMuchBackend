const express = require('express');
const {
  addExpense,
  getExpensesByGroup,
  getUserExpenses
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', addExpense);
router.get('/user', getUserExpenses);
router.get('/group/:groupId', getExpensesByGroup);

module.exports = router;