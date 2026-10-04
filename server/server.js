import dotenv from 'dotenv';

dotenv.config();

import { connectDB } from './config/db.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;

try {
  const conn = await connectDB();
  console.log(`MongoDB connected: ${conn.connection.host}`);
} catch (err) {
  console.warn('DB unreachable — starting without database; API calls will fail');
}

app.listen(PORT, () => {
  console.log(`DEADEND server listening on port ${PORT}`);
});
