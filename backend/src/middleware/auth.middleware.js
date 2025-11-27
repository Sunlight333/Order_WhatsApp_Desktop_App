"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
const jwt_util_1 = require("../utils/jwt.util");
const error_util_1 = require("../utils/error.util");
/**
 * Authentication middleware - verifies JWT token
 */
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = (0, jwt_util_1.extractTokenFromHeader)(authHeader);
        if (!token) {
            res.status(401).json((0, error_util_1.createErrorResponse)('UNAUTHORIZED', 'Authentication required'));
            return;
        }
        const payload = (0, jwt_util_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication failed';
        res.status(401).json((0, error_util_1.createErrorResponse)('UNAUTHORIZED', message));
    }
}
/**
 * Authorization middleware - checks if user has required role
 */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json((0, error_util_1.createErrorResponse)('UNAUTHORIZED', 'Authentication required'));
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json((0, error_util_1.createErrorResponse)('FORBIDDEN', 'Insufficient permissions'));
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.middleware.js.map