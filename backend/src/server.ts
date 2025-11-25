import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/config', configRoutes);
// app.use('/api/v1/users', userRoutes);
// etc.

// Error handling middleware (must be last)
app.use(errorMiddleware);

export function createServer(port: number = env.port) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
  });

  return { app, server };
}

// For standalone server execution (not in Electron)
if (require.main === module) {
  const { server } = createServer();
  
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

