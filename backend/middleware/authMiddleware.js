// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth Middleware - Token received:', token ? 'Yes' : 'No');
  console.log('🔐 Auth Header:', authHeader);

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    console.log('✅ Token decoded successfully:', decoded);
    console.log('🔐 JWT_SECRET used:', process.env.JWT_SECRET ? 'From env' : 'Default');
    req.user = { id: decoded.id, role: decoded.role }; // ✅ Extract id and role from token
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    console.error('❌ Full error:', err);
    res.status(401).json({ msg: 'Token is not valid', error: err.message });
  }
};

export default authMiddleware;
