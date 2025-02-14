import e, { createClient } from '@dbschema/edgeql-js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/modules/app.module';
import { Neo4jService } from '../../modules/neo4j/neo4j.service';
import { seedUsers } from './user.seeder';
import { seedCurrencies } from './currency.seeder';
import { seedExchangeRates } from './exchange-rate.seeder';
import { seedWallets } from './wallet.seeder';
import { seedTransactions } from './transaction.seeder';
import * as dotenv from 'dotenv';

export const client = createClient();

// Load environment variables from .env file
dotenv.config();

async function clearEdgeDB() {
  console.log('🧹 Clearing EdgeDB database...');
  await e.delete(e.Transaction).run(client);
  await e.delete(e.Wallet).run(client);
  await e.delete(e.User).run(client);
  await e.delete(e.ExchangeRate).run(client);
  await e.delete(e.Currency).run(client);
  console.log('🧹 EdgeDB database cleared!');
}

async function clearNeo4j(neo4jService: Neo4jService) {
  console.log('🧹 Clearing Neo4j database...');
  await neo4jService.write('MATCH (n) DETACH DELETE n');
  console.log('🧹 Neo4j database cleared!');
}

async function clearDatabase(neo4jService: Neo4jService) {
  await clearEdgeDB();
  await clearNeo4j(neo4jService);
}

async function seed() {
  console.log('🌱 Starting seed...');
  console.time('⏱️ Seed time');

  const app = await NestFactory.createApplicationContext(AppModule);

  const neo4jService = app.get(Neo4jService);

  try {
    await clearDatabase(neo4jService);
    await seedCurrencies(neo4jService);
    await seedExchangeRates(neo4jService); // Updated function call
    await seedUsers(neo4jService);
    await seedWallets(neo4jService);
    await seedTransactions(neo4jService);

    console.timeEnd('⏱️ Seed time');
    console.log('✅ Seed completed!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    // Close EdgeDB client connection
    await client.close();

    // Close NestJS application context
    await app.close();
  }
}

// Run the seed
seed().catch((error) => {
  console.error(error);
  process.exit(1);
});