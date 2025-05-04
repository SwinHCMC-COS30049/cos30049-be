import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
// import { Neo4jTransactionService } from './transaction-neo4j.service';
import { Neo4jModule } from '../neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule.forRoot()],
  // providers: [TransactionService, Neo4jTransactionService],
  providers: [TransactionService],
  controllers: [TransactionController],
  // exports: [TransactionService, Neo4jTransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
