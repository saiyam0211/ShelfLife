import mongoose from 'mongoose';
import { app } from './app.ts';
import { config } from './config.ts';
import { connectDatabase } from './db.ts';

// Connect to MongoDB before the server accepts requests.
await connectDatabase();

const server = app.listen(config.port, (error?: Error) => {
  if (error) {
    throw error;
  }
  console.log(`ShelfLife API listening on http://localhost:${config.port}`);
});

// Stop new connections, finish open requests, then close the database connection.
function shutdown(): void {
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
