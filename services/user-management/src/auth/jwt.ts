import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';

export function verifyJWT(request: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
  const authHeader = request.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send('Token manquant');
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (request as any).user = payload;
    done();
  } catch (err) {
    reply.status(401).send('Token invalide');
  }
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    throw new Error('Token invalide');
  }
}
