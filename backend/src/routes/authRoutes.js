const express = require('express');
const { signup, login } = require('../controllers/authController');
const { validate, signupSchema, loginSchema } = require('../middleware/validation');

const router = express.Router();

router.post('/signup', validate(signupSchema, 'body'), signup);
router.post('/login', validate(loginSchema, 'body'), login);

module.exports = router;
