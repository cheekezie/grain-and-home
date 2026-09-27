import mongoose from "mongoose";

// Next.js dev reloads
// modules often and serverless hosts reuse warm instances, so the
// connection is kept on `global` rather than reopened per request.
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set — see .env.example");

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { bufferCommands: false }).catch((err) => {
      // Otherwise one failed attempt poisons the process: every later call
      // would replay the same rejected promise instead of retrying.
      cache.promise = null;
      throw err;
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
