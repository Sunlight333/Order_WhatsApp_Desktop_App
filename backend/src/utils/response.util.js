"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuccessResponse = createSuccessResponse;
/**
 * Create success response object
 */
function createSuccessResponse(data, message) {
    return {
        success: true,
        data,
        ...(message && { message }),
    };
}
//# sourceMappingURL=response.util.js.map