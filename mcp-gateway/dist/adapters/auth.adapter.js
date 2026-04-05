"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthAdapter = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class AuthAdapter {
    async verify(request) {
        const authHeader = request.headers.authorization;
        const apiKey = request.headers['x-api-key'];
        // If API Key is present and valid
        if (apiKey && apiKey === process.env.API_KEY) {
            return true;
        }
        // If JWT is present
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const secret = process.env.JWT_SECRET || 'dev-secret';
                jsonwebtoken_1.default.verify(token, secret);
                return true;
            }
            catch (err) {
                return false;
            }
        }
        // Otherwise unauthorized
        return false;
    }
}
exports.AuthAdapter = AuthAdapter;
