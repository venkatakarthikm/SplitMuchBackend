const User = require('../models/User');

// @desc    Search users
// @route   GET /api/users/search?query=
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } },
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username email phone')
    .limit(10);

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching users'
    });
  }
};

// @desc    Get user balance summary
// @route   GET /api/users/balance
// @access  Private
exports.getBalanceSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('balances.user', 'username email phone');

    const owes = user.balances.filter(b => b.amount < 0);
    const owed = user.balances.filter(b => b.amount > 0);

    const totalOwes = owes.reduce((sum, b) => sum + Math.abs(b.amount), 0);
    const totalOwed = owed.reduce((sum, b) => sum + b.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalOwes,
        totalOwed,
        owes: owes.map(b => ({
          user: b.user,
          amount: Math.abs(b.amount)
        })),
        owed: owed.map(b => ({
          user: b.user,
          amount: b.amount
        }))
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching balance'
    });
  }
};