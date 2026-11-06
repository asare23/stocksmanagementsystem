const jwt = require('jsonwebtoken');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = { signAccessToken, signRefreshToken, verifyRefreshToken };
