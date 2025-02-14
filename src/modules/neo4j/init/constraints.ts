import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Neo4jService } from '../neo4j.service';

@Injectable()
export class Neo4jConstraintsInitializer implements OnModuleInit {
  private readonly logger = new Logger(Neo4jConstraintsInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async onModuleInit() {
    await this.initializeConstraints();
    await this.initializeIndexes();
  }

  private async initializeConstraints() {
    try {
      // User Node Constraints
      await this.neo4j.write(`
        CREATE CONSTRAINT user_id_unique IF NOT EXISTS 
        FOR (u:User) REQUIRE u.id IS UNIQUE
      `);
      
      await this.neo4j.write(`
        CREATE CONSTRAINT user_email_unique IF NOT EXISTS 
        FOR (u:User) REQUIRE u.normalizedEmail IS UNIQUE
      `);

      // Wallet Node Constraints
      await this.neo4j.write(`
        CREATE CONSTRAINT wallet_address_unique IF NOT EXISTS 
        FOR (w:Wallet) REQUIRE w.address IS UNIQUE
      `);
      
      await this.neo4j.write(`
        CREATE CONSTRAINT wallet_id_unique IF NOT EXISTS 
        FOR (w:Wallet) REQUIRE w.id IS UNIQUE
      `);

      // Transaction Node Constraints
      await this.neo4j.write(`
        CREATE CONSTRAINT transaction_hash_unique IF NOT EXISTS 
        FOR (t:Transaction) REQUIRE t.hash IS UNIQUE
      `);

      // Currency Node Constraints
      await this.neo4j.write(`
        CREATE CONSTRAINT currency_symbol_unique IF NOT EXISTS 
        FOR (c:Currency) REQUIRE c.symbol IS UNIQUE
      `);

      // Exchange Rate Node Constraints
      await this.neo4j.write(`
        CREATE CONSTRAINT exchange_rate_pair_unique IF NOT EXISTS 
        FOR (e:ExchangeRate) REQUIRE (e.fromSymbol, e.toSymbol) IS UNIQUE
      `);

      // Ensure required properties
      await this.neo4j.write(`
        CREATE CONSTRAINT user_firstName_required IF NOT EXISTS
        FOR (u:User) REQUIRE u.firstName IS NOT NULL
      `);

      await this.neo4j.write(`
        CREATE CONSTRAINT user_lastName_required IF NOT EXISTS
        FOR (u:User) REQUIRE u.lastName IS NOT NULL
      `);

      await this.neo4j.write(`
        CREATE CONSTRAINT transaction_amount_required IF NOT EXISTS
        FOR (t:Transaction) REQUIRE t.amount IS NOT NULL
      `);

      await this.neo4j.write(`
        CREATE CONSTRAINT transaction_timestamp_required IF NOT EXISTS
        FOR (t:Transaction) REQUIRE t.timestamp IS NOT NULL
      `);

      this.logger.log('Neo4j constraints initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Neo4j constraints:', error);
      throw error;
    }
  }

  private async initializeIndexes() {
    try {
      // User Indexes
      await this.neo4j.write(`
        CREATE INDEX user_name_idx IF NOT EXISTS 
        FOR (u:User) ON (u.firstName, u.lastName)
      `);

      // Wallet Indexes
      await this.neo4j.write(`
        CREATE INDEX wallet_balance_idx IF NOT EXISTS 
        FOR (w:Wallet) ON (w.balance)
      `);

      // Transaction Indexes
      await this.neo4j.write(`
        CREATE INDEX transaction_timestamp_idx IF NOT EXISTS 
        FOR (t:Transaction) ON (t.timestamp)
      `);

      await this.neo4j.write(`
        CREATE INDEX transaction_amount_idx IF NOT EXISTS 
        FOR (t:Transaction) ON (t.amount)
      `);

      await this.neo4j.write(`
        CREATE INDEX transaction_status_idx IF NOT EXISTS 
        FOR (t:Transaction) ON (t.status)
      `);

      // Currency Indexes
      await this.neo4j.write(`
        CREATE INDEX currency_name_idx IF NOT EXISTS 
        FOR (c:Currency) ON (c.name)
      `);

      // Exchange Rate Indexes
      await this.neo4j.write(`
        CREATE INDEX exchange_rate_timestamp_idx IF NOT EXISTS 
        FOR (e:ExchangeRate) ON (e.timestamp)
      `);

      // Composite Indexes for Common Query Patterns
      await this.neo4j.write(`
        CREATE INDEX transaction_time_amount_idx IF NOT EXISTS 
        FOR (t:Transaction) ON (t.timestamp, t.amount)
      `);

      this.logger.log('Neo4j indexes initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Neo4j indexes:', error);
      throw error;
    }
  }
}