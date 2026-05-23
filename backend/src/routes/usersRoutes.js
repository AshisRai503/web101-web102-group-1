const express = require('express');
const { listUsers, getMe, uploadAvatar } = require('../controllers/usersController');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const router = express.Router();

router.get('/', authenticateToken, listUsers);
router.get('/me', authenticateToken, getMe);
router.post('/me/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);

module.exports = router;
