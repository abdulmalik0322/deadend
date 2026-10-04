import mongoose from 'mongoose';

/**
 * Connect to MongoDB using MONGODB_URI.
 * Resolves with the connection on success; THROWS on failure so the
 * caller (server.js, seed scripts, tests) decides how to handle it.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and configure it.');
  }

  return mongoose.connect(uri);
}
