"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_controller_1 = require("../controllers/database.controller");
const router = (0, express_1.Router)();
// Database test endpoint - public (needed for configuration before login)
router.post('/test', database_controller_1.testDatabaseController);
exports.default = router;
//# sourceMappingURL=database.routes.js.map