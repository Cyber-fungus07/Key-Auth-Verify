import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import express from 'express';
import connectDB from './db/db.js';
import protectedRoutes from './routes/auth.protected.js';
// import cookieParser from 'cookie-parser';
import { router as userRoute } from './routes/auth.route.js';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5001;

connectDB();
app.use(express.json());
app.use(cors());
// app.use(cookieParser());
app.use('/api/auth/user', userRoute);
app.use('/api', protectedRoutes);

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
