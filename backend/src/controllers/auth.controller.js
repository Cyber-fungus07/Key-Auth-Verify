import { User } from '../modals/auth.modal.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ashmit_secretkey';

export async function registerUser(req, res) {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'Username or email already exists!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const payload = {
      id: user._id,
      username: user.username,
      email: user.email,
    };
    const token = jwt.sign(payload, JWT_SECRET);

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: 'Username or email already exists!' });
    }

    return res.status(500).json({ error: `Server Error! : ${err}` });
  }
}

export async function loginUser(req, res) {
  try {
    const { username, email, password } = req.body;
    if ((!username && !email) || !password) {
      return res
        .status(400)
        .json({ message: 'Username or email, and password are required' });
    }

    const user = await User.findOne({ $or: [{ email }, { username }] });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or email' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Passwords dont match' });
    }

    const payload = {
      id: user._id,
      username: user.username,
      email: user.email,
    };
    const token = jwt.sign(payload, JWT_SECRET);

    return res.status(200).json({
      message: 'User login successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: `Server Error! : ${err}` });
  }
}

// export function logoutUser(_req: Request, res: Response): void {
//   // fixed: call the function
//   res.clearCookie('token', { httpOnly: true });
//   res.status(200).json({ message: 'Logged out successfully' });
// }
