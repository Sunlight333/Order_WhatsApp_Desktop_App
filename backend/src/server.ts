import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { initializeDatabaseConnection } from './config/database';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads (avatars)
// In Electron, use userData directory for uploads
const uploadsPath = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));
console.log('📁 Serving uploads from:', uploadsPath);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// API routes
import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';
import supplierRoutes from './routes/supplier.routes';
import productRoutes from './routes/product.routes';
import configRoutes from './routes/config.routes';
import userRoutes from './routes/user.routes';
import databaseRoutes from './routes/database.routes';
import backupRoutes from './routes/backup.routes';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/database', databaseRoutes);
app.use('/api/v1/backup', backupRoutes);
// etc.

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Global error handlers to prevent server crashes
function setupGlobalErrorHandlers() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('❌ Uncaught Exception - Server will continue running:', error);
    console.error('Error stack:', error.stack);
    // Don't exit - let server continue
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('❌ Unhandled Promise Rejection - Server will continue running:', reason);
    if (reason instanceof Error) {
      console.error('Error stack:', reason.stack);
    }
    // Don't exit - let server continue
  });

  // Handle warnings
  process.on('warning', (warning: Error) => {
    console.warn('⚠️  Process Warning:', warning.message);
    if (warning.stack) {
      console.warn('Warning stack:', warning.stack);
    }
  });
}

export async function createServer(port: number = env.port): Promise<{ app: express.Application; server: any }> {
  // Setup global error handlers first
  setupGlobalErrorHandlers();
  
  // Initialize database connection before starting server
  try {
    console.log('🔌 Initializing database connection...');
    await initializeDatabaseConnection();
    console.log('✅ Database connection initialized successfully');
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error);
    console.error('Error stack:', error.stack);
    // Still start server but log the error clearly
    console.error('⚠️  Server will start, but database operations may fail');
    console.error('⚠️  The application will attempt to reconnect to the database on next request');
  }
  
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`📡 Server accessible at http://localhost:${port}`);
        resolve({ app, server });
      });

      server.on('error', (error: any) => {
        console.error('❌ Server error:', error);
        // If port is in use, try to resolve gracefully
        if (error.code === 'EADDRINUSE') {
          console.error(`⚠️  Port ${port} is already in use. Server may already be running.`);
          // Still resolve - let the caller handle it
          resolve({ app, server: null });
        } else {
          // For other errors, still try to resolve to prevent crash
          console.error('⚠️  Server error occurred, but continuing...');
          resolve({ app, server: null });
        }
      });

      // Handle server close events gracefully
      server.on('close', () => {
        console.log('🛑 Server closed');
      });
    } catch (error: any) {
      console.error('❌ Failed to create server:', error);
      // Don't reject - return a server object that can be retried
      console.error('⚠️  Returning server object for retry...');
      resolve({ app, server: null });
    }
  });
}

// For standalone server execution (not in Electron)
if (require.main === module) {
  createServer().then(({ server }) => {
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
      });
    });
  }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

