import { MongoClient } from 'mongodb';
import { config } from './server.config';
import { logger } from '@utils/logger';

const uri = config.database.url;
let client: MongoClient;

export const connectMongoClient = async (): Promise<MongoClient> => {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    logger.info('MongoClient connected (native driver)');
  }
  return client;
};

export const getDatabases = async () => {
  const client = await connectMongoClient();
  return {
    db1: client.db('support-service-camp-haven'), // main support DB
    db2: client.db('auth-service-camp-haven')                // user DB (cross-database)
  };
};