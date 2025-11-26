import rateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';

export async function registerRateLimit(fastify: FastifyInstance) {
  fastify.register(rateLimit, {
    max: 5, // 5 requêtes
    timeWindow: '1 minute',
    allowList: [],
  });
}
