import { connect } from 'nats';
import { AuthSubscriber } from './nats/auth.subscriber';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  try {
    console.log('🚀 Starting Auth Service...');

    const nc = await connect({ 
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      name: 'auth-service'
    });

    console.log('✅ Connected to NATS');

    const authSubscriber = new AuthSubscriber(nc);
    await authSubscriber.start();

    console.log('🔔 Auth Service is running and listening for NATS messages');

    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down Auth Service...');
      await nc.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('🛑 Shutting down Auth Service...');
      await nc.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start Auth Service:', error);
    process.exit(1);
  }
}

bootstrap();
