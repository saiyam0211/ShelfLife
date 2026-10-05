import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';
import { config } from './config.ts';

// Import every model before this call. Only registered models get their indexes.
export async function connectDatabase(dbName?: string): Promise<void> {
  await mongoose.connect(config.mongodbUri, dbName ? { dbName } : {});
  // Wait for index builds. Unique rules must exist before the first request.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

// Run all writes in `work` as one transaction.
// The transaction commits when `work` resolves and cancels when `work` throws.
// The driver can run `work` again after a transient failure, such as a write
// conflict between two librarians. Keep side effects outside `work`.
export async function inTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session), {
      writeConcern: { w: 'majority' },
    });
  } finally {
    await session.endSession();
  }
}
