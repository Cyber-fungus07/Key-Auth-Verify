import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ashmit_secretkey';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log("AUTH HEADER:", req.headers.authorization);
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  console.log("TOKEN:", token);
  if (!token) {
    res.status(401).json({ message: 'Token missing' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }
}

