const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');

const updateBalances = async (expense) => {
  const payer = expense.paidBy;
  for (const split of expense.splits) {
    if (split.user.toString() === payer.toString()) continue;
    await User.findOneAndUpdate(
      { _id: payer, 'balances.user': split.user },
      { $inc: { 'balances.$.amount': split.amount } }
    );
    const payerUser = await User.findOne({ _id: payer, 'balances.user': split.user });
    if (!payerUser) {
      await User.findByIdAndUpdate(payer, {
        $push: { balances: { user: split.user, amount: split.amount } }
      });
    }
    await User.findOneAndUpdate(
      { _id: split.user, 'balances.user': payer },
      { $inc: { 'balances.$.amount': -split.amount } }
    );
    const splitUser = await User.findOne({ _id: split.user, 'balances.user': payer });
    if (!splitUser) {
      await User.findByIdAndUpdate(split.user, {
        $push: { balances: { user: payer, amount: -split.amount } }
      });
    }
  }
};

// expenseController.js

exports.addExpense = async (req, res) => {
  try {
    const { description, amount, groupId, splitType, splits, note } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    let processedSplits = [];
    const totalAmount = parseFloat(amount);

    if (splitType === 'EQUAL') {
      const splitAmount = totalAmount / splits.length;
      processedSplits = splits.map(userId => ({
        user: userId,
        amount: parseFloat(splitAmount.toFixed(2)),
        isPaid: userId === req.user.id // Creator share is paid
      }));
    } else if (splitType === 'EXACT') {
      processedSplits = splits.map(s => ({
        ...s,
        isPaid: (s.user._id || s.user).toString() === req.user.id
      }));
    } else if (splitType === 'PERCENTAGE') {
      // Validate percentages sum to exactly 100
      const totalPercentage = splits.reduce((sum, s) => sum + parseFloat(s.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({ success: false, message: 'Percentages must sum to 100' });
      }

      processedSplits = splits.map(s => ({
        user: s.user,
        percentage: s.percentage,
        amount: parseFloat((totalAmount * parseFloat(s.percentage) / 100).toFixed(2)),
        isPaid: (s.user._id || s.user).toString() === req.user.id // Creator share is paid
      }));
    }

    const expense = await Expense.create({
      description,
      amount: totalAmount,
      paidBy: req.user.id,
      group: groupId,
      splitType,
      splits: processedSplits,
      note
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'username email')
      .populate('splits.user', 'username email');

    // Formatted Chat message for transparency
    const splitDetails = populatedExpense.splits
      .filter(s => s.user._id.toString() !== req.user.id)
      .map(s => {
        const detail = splitType === 'PERCENTAGE' ? `${s.percentage}% - ` : '';
        return `\n   (@${s.user.username} - ${detail}₹${s.amount.toFixed(2)})`;
      })
      .join('');

    group.messages.push({
      sender: req.user.id,
      content: `📢 New Bill: "${description}" (₹${totalAmount})${splitDetails}`,
      timestamp: new Date()
    });

    // Create notifications for debtors
    for (const split of populatedExpense.splits) {
      if (split.user._id.toString() !== req.user.id) {
        await Notification.create({
          user: split.user._id,
          type: 'EXPENSE_ADDED',
          title: 'New Expense Added',
          message: `${req.user.username} added a bill. You owe ₹${split.amount.toFixed(2)}`,
          relatedGroup: groupId,
          relatedExpense: expense._id
        });
      }
    }

    group.expenses.push(expense._id);
    await group.save();
    await updateBalances(expense);

    const io = req.app.get('io');
    io.to(`group-${groupId}`).emit('new-expense', populatedExpense);
    io.to(`group-${groupId}`).emit('new-message', {
      groupId,
      message: group.messages[group.messages.length - 1]
    });

    res.status(201).json({ success: true, data: populatedExpense });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ success: false, message: 'Error adding expense' });
  }
};

// @desc    Get expenses by group
// @route   GET /api/expenses/group/:groupId
// @access  Private
exports.getExpensesByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Expense.countDocuments({ group: groupId });

    const expenses = await Expense.find({ group: groupId })
      .populate('paidBy', 'username email')
      .populate('splits.user', 'username email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expenses'
    });
  }
};

// @desc    Get all user expenses
// @route   GET /api/expenses/user
// @access  Private
exports.getUserExpenses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Expense.countDocuments({
      $or: [
        { paidBy: req.user.id },
        { 'splits.user': req.user.id }
      ]
    });

    const expenses = await Expense.find({
      $or: [
        { paidBy: req.user.id },
        { 'splits.user': req.user.id }
      ]
    })
    .populate('paidBy', 'username email')
    .populate('splits.user', 'username email')
    .populate('group', 'name')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

    res.status(200).json({
      success: true,
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expenses'
    });
  }
};