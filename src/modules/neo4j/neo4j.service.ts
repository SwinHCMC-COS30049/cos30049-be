import { Injectable, OnApplicationShutdown, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session, QueryResult, ManagedTransaction, Config } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnApplicationShutdown {
  private readonly driver: Driver;
  private readonly logger = new Logger(Neo4jService.name);

  constructor(private readonly configService: ConfigService) {
    const uri = this.configService.get<string>('neo4j.uri');
    const username = this.configService.get<string>('neo4j.username');
    const password = this.configService.get<string>('neo4j.password');
    const database = this.configService.get<string>('neo4j.database') || 'neo4j';

    const config: Config = {
      maxTransactionRetryTime: 30000,
      maxConnectionPoolSize: 50,
      connectionTimeout: 30000,
      connectionAcquisitionTimeout: 2000,
    };

    if (!password) {
      throw new Error('Neo4j password is not configured. Please check your environment variables.');
    }
  
    try {
      this.driver = neo4j.driver(
        uri ?? '',
        neo4j.auth.basic(username ?? '', password),
        config
      );
      this.logger.log(`Neo4j connection established to ${uri}`);
    } catch (error) {
      this.logger.error('Failed to create Neo4j driver:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.driver?.close();
      this.logger.log('Neo4j connection closed');
    } catch (error) {
      this.logger.error('Error closing Neo4j connection:', error);
      throw error;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.close();
  }

  async read(
    query: string,
    parameters?: Record<string, any>
  ): Promise<QueryResult> {
    const session: Session = this.driver.session({
      database: this.configService.get<string>('neo4j.database') || 'neo4j',
      defaultAccessMode: neo4j.session.READ,
    });

    try {
      const result = await session.run(query, parameters);
      return result;
    } catch (error) {
      this.logger.error(`Error executing read query: ${query}`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async write(
    query: string,
    parameters?: Record<string, any>
  ): Promise<QueryResult> {
    const session: Session = this.driver.session({
      database: this.configService.get<string>('neo4j.database') || 'neo4j',
      defaultAccessMode: neo4j.session.WRITE,
    });

    try {
      const result = await session.run(query, parameters);
      return result;
    } catch (error) {
      this.logger.error(`Error executing write query: ${query}`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async executeTransaction(
    transactionWork: (tx: ManagedTransaction) => Promise<any>
  ): Promise<any> {
    const session = this.driver.session({
      database: this.configService.get<string>('neo4j.database') || 'neo4j'
    });
    try {
      const result = await session.executeWrite(transactionWork);
      return result;
    } catch (error) {
      this.logger.error('Error executing transaction:', error);
      throw error;
    } finally {
      await session.close();
    }
  }
}