import { FastifyRequest } from 'fastify';

/**
 * Port defining the contract for authentication logic
 */
export interface IAuthPort {
  /**
   * Verify if the current request is authorized based on token or api-key
   * Throws an error or returns false if unauthorized
   */
  verify(request: FastifyRequest): Promise<boolean>;
}
