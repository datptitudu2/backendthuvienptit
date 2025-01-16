const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { getUserActivities } = require('../controllers/activity.controller');

router.get('/', verifyToken, getUserActivities);

module.exports = router; 