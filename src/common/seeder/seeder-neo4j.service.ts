import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../../modules/neo4j/neo4j.service';
import { seedExchangeRates } from './exchange-rate-neo4j.seeder';
import { seedWallets } from './wallet-neo4j.seeder';
import { seedTransactions } from './transaction-neo4j.seeder';
import { seedCurrencies } from './currency-neo4j.seeder';
import { seedUsers } from './user-neo4j.seeder';

@Injectable()
export class Neo4jSeederService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async seed() {
    console.log('Neo4j Seeding')
    console.log('🌱 Starting seed...');
    console.time('⏱️ Seed time');

    try {
      console.log('🧹 Clearing database...');
      await this.neo4jService.write('MATCH (n) DETACH DELETE n');
      console.log('🧹 Database cleared!');

      await seedUsers(this.neo4jService);      
      await seedCurrencies(this.neo4jService);
      await seedExchangeRates(this.neo4jService);
      await seedWallets(this.neo4jService);
      await seedTransactions(this.neo4jService);
      
      console.timeEnd('⏱️ Seed time');
      console.log('✅ Seed completed!');

    } catch (error) {
      console.error('❌ Seed failed:', error);
      throw error;
    }
  }
}