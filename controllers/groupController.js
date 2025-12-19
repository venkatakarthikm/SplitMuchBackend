const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Create a group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    const group = await Group.create({
      name,
      description,
      createdBy: req.user.id,
      members: [{
        user: req.user.id,
        joinedAt: new Date()
      }]
    });

    // Add group to user
    await User.findByIdAndUpdate(req.user.id, {
      $push: { groups: group._id }
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'username email')
      .populate('members.user', 'username email phone');

    res.status(201).json({
      success: true,
      data: populatedGroup
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating group'
    });
  }
};

// @desc    Get all user groups
// @route   GET /api/groups
// @access  Private
exports.getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user.id
    })
    .populate('createdBy', 'username email')
    .populate('members.user', 'username email phone')
    .populate('pendingInvites.user', 'username email phone')
    .populate('pendingInvites.invitedBy', 'username email')
    .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching groups'
    });
  }
};

// @desc    Get group by ID
// @route   GET /api/groups/:id
// @access  Private
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('members.user', 'username email phone')
      .populate('messages.sender', 'username')
      .populate({
        path: 'expenses',
        populate: [
          { path: 'paidBy', select: 'username email' },
          { path: 'splits.user', select: 'username email' }
        ]
      });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member
    const isMember = group.members.some(m => m.user._id.toString() === req.user.id);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this group'
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching group'
    });
  }
};

// @desc    Invite user to group
// @route   POST /api/groups/:id/invite
// @access  Private
exports.inviteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const groupId = req.params.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member
    const isMember = group.members.some(m => m.user.toString() === req.user.id);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to invite users'
      });
    }

    // Check if user is already a member
    const alreadyMember = group.members.some(m => m.user.toString() === userId);

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member'
      });
    }

    // Check if user is already invited
    const alreadyInvited = group.pendingInvites.some(i => i.user.toString() === userId);

    if (alreadyInvited) {
      return res.status(400).json({
        success: false,
        message: 'User is already invited'
      });
    }

    // Add to pending invites
    group.pendingInvites.push({
      user: userId,
      invitedBy: req.user.id,
      invitedAt: new Date()
    });

    await group.save();

    // Create notification
    await Notification.create({
      user: userId,
      type: 'GROUP_INVITE',
      title: 'Group Invitation',
      message: `You have been invited to join ${group.name}`,
      relatedGroup: groupId,
      actionData: {
        groupId,
        groupName: group.name,
        invitedBy: req.user.username
      }
    });

    const populatedGroup = await Group.findById(groupId)
      .populate('pendingInvites.user', 'username email phone')
      .populate('pendingInvites.invitedBy', 'username email');

    res.status(200).json({
      success: true,
      data: populatedGroup
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error inviting user'
    });
  }
};

// @desc    Respond to group invitation
// @route   POST /api/groups/:id/respond
// @access  Private
exports.respondToInvite = async (req, res) => {
  try {
    const { accept } = req.body;
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Find the invite index
    const inviteIndex = group.pendingInvites.findIndex(i => i.user.toString() === userId);

    if (inviteIndex === -1) {
      return res.status(400).json({ success: false, message: 'No pending invitation found' });
    }

    // REMOVE from pending
    group.pendingInvites.splice(inviteIndex, 1);

    if (accept) {
      // ADD to members
      group.members.push({ user: userId, joinedAt: new Date() });

      // UPDATE user record
      await User.findByIdAndUpdate(userId, { $addToSet: { groups: groupId } });
    }

    await group.save();
    res.status(200).json({ success: true, message: accept ? 'Accepted' : 'Declined' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ... include other methods (createGroup, getUserGroups, etc.) from your previous version here

// @desc    Send message in group
// @route   POST /api/groups/:id/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const groupId = req.params.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member
    const isMember = group.members.some(m => m.user.toString() === req.user.id);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages'
      });
    }

    const message = {
      sender: req.user.id,
      content,
      timestamp: new Date()
    };

    group.messages.push(message);
    await group.save();

    const populatedMessage = await Group.findById(groupId)
      .select('messages')
      .populate('messages.sender', 'username')
      .then(g => g.messages[g.messages.length - 1]);

    // Emit socket event
    const io = req.app.get('io');
    io.to(`group-${groupId}`).emit('new-message', {
      groupId,
      message: populatedMessage
    });

    res.status(200).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
};

// @desc    Get group messages
// @route   GET /api/groups/:id/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .select('messages')
      .populate('messages.sender', 'username');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.status(200).json({
      success: true,
      data: group.messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages'
    });
  }
};