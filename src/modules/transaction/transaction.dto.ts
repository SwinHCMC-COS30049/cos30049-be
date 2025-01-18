import { CurrencyDto } from '../currency/currency.dto';
import { WalletDto } from '../wallet/wallet.dto';

export class TransactionDto {
  id: string;
  hash: string;
  amount: number;
  input: string;
  transactionIndex: number;
  gas: number;
  gasUsed: number;
  gasPrice: number;
  transactionFee: number;
  blockNumber: number;
  blockHash: string;
  blockTimestamp: number;
  createdAt: Date;

  sourceWallet?: WalletDto;
  destinationWallet?: WalletDto;
  currency?: CurrencyDto;
}

export enum TransactionType {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  ALL = 'ALL',
}