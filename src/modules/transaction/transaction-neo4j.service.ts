import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { GetWalletTransactionsOuput, TransactionType } from './transaction.dto';
import { PaginationMetadata } from 'src/common/pagination/pagination.dto';
import { Any } from 'src/common/types/lib';

@Injectable()
export class TransactionService {
  constructor(private neo4jService: Neo4jService) {}

  async getWalletTransactions({
    address,
    type = TransactionType.ALL,
    limit = 10,
    page = 1,
    transactionHash,
    dstAddress,
    createdAtOrder = 'DESC',
  }: {
    address: string;
    type?: TransactionType;
    limit?: number;
    page?: number;
    transactionHash?: string;
    dstAddress?: string;
    createdAtOrder?: 'ASC' | 'DESC';
  }): Promise<GetWalletTransactionsOuput> {
    const skip = (page - 1) * limit;
    const order = createdAtOrder === 'ASC' ? 'ASC' : 'DESC';

    const matchQuery = `
      MATCH (wallet:Wallet {address: $address})
      MATCH (transaction:Transaction)
      WHERE (transaction.sourceWallet = wallet OR transaction.destinationWallet = wallet)
      ${transactionHash ? 'AND transaction.hash CONTAINS $transactionHash' : ''}
      ${dstAddress ? 'AND transaction.destinationWallet.address CONTAINS $dstAddress' : ''}
      ${type === TransactionType.INCOMING ? 'AND transaction.destinationWallet = wallet' : ''}
      ${type === TransactionType.OUTGOING ? 'AND transaction.sourceWallet = wallet' : ''}
    `;

    const totalQuery = `
      ${matchQuery}
      RETURN COUNT(transaction) AS total
    `;

    const transactionsQuery = `
      ${matchQuery}
      RETURN transaction, transaction.sourceWallet, transaction.destinationWallet
      ORDER BY transaction.blockTimestamp ${order}
      SKIP $skip
      LIMIT $limit
    `;

    const totalResult = await this.neo4jService.read(totalQuery, {
      address,
      transactionHash,
      dstAddress,
    });

    const total = totalResult.records[0].get('total').low;

    const transactionsResult = await this.neo4jService.read(transactionsQuery, {
      address,
      transactionHash,
      dstAddress,
      skip,
      limit,
    });

    const transactions = transactionsResult.records.map((record: Any) => ({
      ...record.get('transaction').properties,
      sourceWallet: record.get('transaction.sourceWallet').properties,
      destinationWallet: record.get('transaction.destinationWallet').properties,
    }));

    const metadata = new PaginationMetadata({ page, limit, total });

    return {
      transactions,
      metadata,
    };
  }
}
