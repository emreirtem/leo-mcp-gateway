import { IAuthPort } from '../ports/auth.port';
import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';

export class AuthAdapter implements IAuthPort {
  async verify(request: FastifyRequest): Promise<boolean> {
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
        jwt.verify(token, secret);
        return true;
      } catch (err) {
        return false;
      }
    }

    // Otherwise unauthorized
    return false;
  }
}
