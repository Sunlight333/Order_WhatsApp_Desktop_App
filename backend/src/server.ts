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
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

export async function createServer(port: number = env.port) {
  // Initialize database connection before starting server
  try {
    await initializeDatabaseConnection();
  } catch (error: any) {
    console.error('⚠️  Database initialization failed, but continuing...', error.message);
    // Continue anyway - some operations might still work
  }
  
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
  });

  return { app, server };
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

