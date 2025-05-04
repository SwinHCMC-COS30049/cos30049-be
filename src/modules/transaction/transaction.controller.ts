import { Controller, Get } from '@nestjs/common';
import { TransactionService } from './transaction.service';
// import { Neo4jTransactionService } from './transaction-neo4j.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    // private readonly neo4jTransactionService: Neo4jTransactionService,
  ) {}

  // @Get('graph')
  // async getGraphData() {
  //   return this.neo4jTransactionService.fetchGraphData();
  // }

  // Add other endpoints that use TransactionService as needed
}
