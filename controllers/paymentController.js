const Payment = require('../models/Payment');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Notification = require('../models/Notification');

exports.makePayment = async (req, res) => {
  try {
    const { paidTo, amount, groupId, expenseId, note } = req.body;
    const paymentAmount = parseFloat(amount);

    const payment = await Payment.create({
      paidBy: req.user.id, paidTo, amount: paymentAmount,
      group: groupId, expense: expenseId || null, note
    });

    let settlementStatus = "";
    let billDescription = "settlement";

    if (expenseId) {
      const expense = await Expense.findById(expenseId);
      const splitIndex = expense.splits.findIndex(s => s.user.toString() === req.user.id);
      
      if (splitIndex !== -1) {
        expense.splits[splitIndex].amount -= paymentAmount;
        billDescription = expense.description;

        if (expense.splits[splitIndex].amount <= 0.01) {
          expense.splits[splitIndex].isPaid = true;
          expense.splits[splitIndex].amount = 0;
          settlementStatus = "full settle";
        } else {
          settlementStatus = `remaining ₹${expense.splits[splitIndex].amount.toFixed(2)}`;
        }
        await expense.save();
      }
    }

    // Update Global Balances (Fixes Dashboard)
    await User.findOneAndUpdate({ _id: req.user.id, 'balances.user': paidTo }, { $inc: { 'balances.$.amount': paymentAmount } });
    await User.findOneAndUpdate({ _id: paidTo, 'balances.user': req.user.id }, { $inc: { 'balances.$.amount': -paymentAmount } });

    // NOTIFICATION TO PAYEE
    await Notification.create({
      user: paidTo,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `${req.user.username} paid you ₹${paymentAmount.toFixed(2)} for ${billDescription}`,
      relatedGroup: groupId,
      relatedPayment: payment._id
    });

    const group = await Group.findById(groupId);
    const payeeUser = await User.findById(paidTo);
    
    // FORMATTED SETTLEMENT CHAT MESSAGE
    const payMsg = {
      sender: req.user.id,
      content: `✅ Paid ₹${paymentAmount.toFixed(2)} to ${payeeUser.username} for "${billDescription}" || ${settlementStatus}`,
      timestamp: new Date()
    };
    group.messages.push(payMsg);
    await group.save();

    const io = req.app.get('io');
    io.to(`group-${groupId}`).emit('payment-updated', { groupId });
    io.to(`group-${groupId}`).emit('new-message', { groupId, message: group.messages[group.messages.length - 1] });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment failed' });
  }
};

// @desc    Get payment history
// @route   GET /api/payments
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Payment.countDocuments({
      $or: [
        { paidBy: req.user.id },
        { paidTo: req.user.id }
      ]
    });

    const payments = await Payment.find({
      $or: [
        { paidBy: req.user.id },
        { paidTo: req.user.id }
      ]
    })
    .populate('paidBy', 'username email')
    .populate('paidTo', 'username email')
    .populate('group', 'name')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
    });
  }
};

// @desc    Get payments by group
// @route   GET /api/payments/group/:groupId
// @access  Private
exports.getPaymentsByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Payment.countDocuments({ group: groupId });

    const payments = await Payment.find({ group: groupId })
      .populate('paidBy', 'username email')
      .populate('paidTo', 'username email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get group payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments'
    });
  }
};