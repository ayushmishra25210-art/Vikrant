const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { employeeId, phoneNumber, password } = req.body;
  if (!employeeId || !phoneNumber || !password) {
    return res.status(400).json({ message: 'Employee ID, phone number and password are required.' });
  }

  const normalizedPhoneNumber = String(phoneNumber).replace(/\D/g, '');
  const user = await User.findOne({
    where: {
      employeeId: employeeId.trim().toUpperCase(),
      phoneNumber: normalizedPhoneNumber,
    },
  });
  if (!user) {
    return res.status(401).json({ message: 'Invalid Employee ID or password.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid Employee ID or password.' });
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = jwt.sign({ sub: user.id, role: user.role, employeeId: user.employeeId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  res.json({ token, user: user.toSafeJSON() });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

module.exports = { login, me };
