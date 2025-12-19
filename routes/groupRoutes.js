const express = require('express');
const {
  createGroup,
  getUserGroups,
  getGroupById,
  inviteUser,
  respondToInvite,
  sendMessage,
  getMessages
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getUserGroups)
  .post(createGroup);

router.get('/:id', getGroupById);
router.post('/:id/invite', inviteUser);
router.post('/:id/respond', respondToInvite);
router.post('/:id/messages', sendMessage);
router.get('/:id/messages', getMessages);

module.exports = router;