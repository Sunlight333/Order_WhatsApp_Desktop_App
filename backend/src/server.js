"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files for uploads (avatars)
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Health check endpoint
app.get('/api/v1/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
});
// API routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const supplier_routes_1 = __importDefault(require("./routes/supplier.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const config_routes_1 = __importDefault(require("./routes/config.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const database_routes_1 = __importDefault(require("./routes/database.routes"));
const backup_routes_1 = __importDefault(require("./routes/backup.routes"));
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/orders', order_routes_1.default);
app.use('/api/v1/suppliers', supplier_routes_1.default);
app.use('/api/v1/products', product_routes_1.default);
app.use('/api/v1/config', config_routes_1.default);
app.use('/api/v1/users', user_routes_1.default);
app.use('/api/v1/database', database_routes_1.default);
app.use('/api/v1/backup', backup_routes_1.default);
// etc.
// Error handling middleware (must be last)
app.use(error_middleware_1.errorMiddleware);
function createServer(port = env_1.env.port) {
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
//# sourceMappingURL=server.js.map