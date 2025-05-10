import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import e, { createClient } from '@dbschema/edgeql-js';

// Create a new client instance for this seeder
const client = createClient();

interface DeribitWalletData {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  dateTime: string;
  from: string;
  to: string;
  contractAddress: string;
  valueIn: number;
  valueOut: number;
  currentValue: number;
  txnFee: number;
  txnFeeUSD: number;
  historicalPrice: number;
  status: string;
  errCode: string;
  method: string;
}

interface BtcTransactionData {
  txNumber: number;
  effect: number;
  ticker: string;
  amountFiat: number;
  assetRate: number;
  type: string;
  date: string;
  publicKey: string;
  walletAddress: string;
  thirdPartyAddress: string;
  transactionHash: string;
}

async function clearDatabase() {
  console.log('🧹 Clearing entire database...');
  await e.delete(e.Transaction).run(client);
  await e.delete(e.Wallet).run(client);
  await e.delete(e.User).run(client);
  await e.delete(e.ExchangeRate).run(client);
  await e.delete(e.Currency).run(client);
  console.log('🧹 Database cleared!');
}

async function processBtcTransactions(csvFilePath: string) {
  console.log('Processing BTC transactions from:', csvFilePath);
  
  try {
    const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8');
    console.log('Successfully read BTC CSV file, content length:', fileContent.length);
    
    const records = await new Promise((resolve, reject) => {
      parse(fileContent, {
        columns: [
          'Tx number',
          'Effect',
          'Ticker',
          'Amount fiat (USD)',
          'Asset rate (USD)',
          'Type',
          'Date',
          'Public key',
          'Wallet address',
          'Third-party address',
          'Transaction hash'
        ],
        skip_empty_lines: true,
        skipRecordsWithError: true,
        delimiter: ';',
        from_line: 21, // Skip the header information and start from actual transactions
        trim: true,
        quote: '"',
        relax_column_count: true,
      }, (err, records) => {
        if (err) {
          console.error('Error parsing BTC CSV:', err);
          reject(err);
        } else {
          console.log('Successfully parsed BTC CSV, number of records:', records.length);
          console.log('First record:', records[0]); // Log the first record to see its structure
          resolve(records);
        }
      });
    });

    const btcTransactions: BtcTransactionData[] = (records as any[])
      .filter(record => record && record['Tx number'] !== undefined && record['Transaction hash'] !== undefined)
      .map(record => {
        console.log('Processing record:', record); // Log each record being processed
        return {
          txNumber: parseInt(record['Tx number']),
          effect: parseFloat(record['Effect']),
          ticker: record['Ticker'],
          amountFiat: parseFloat(record['Amount fiat (USD)']),
          assetRate: parseFloat(record['Asset rate (USD)']),
          type: record['Type'],
          date: record['Date'],
          publicKey: record['Public key'] || '',
          walletAddress: record['Wallet address'] || '',
          thirdPartyAddress: record['Third-party address'] || '',
          transactionHash: record['Transaction hash'],
        };
      });

    console.log(`Processed ${btcTransactions.length} BTC transactions`);
    if (btcTransactions.length > 0) {
      console.log('Sample transaction:', btcTransactions[0]);
    }

    // Create BTC currency
    console.log('Creating BTC currency...');
    await e.insert(e.Currency, {
      symbol: 'BTC',
      name: 'Bitcoin',
      iconImg: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    }).run(client);

    // Process BTC transactions
    for (const tx of btcTransactions) {
      try {
        console.log(`Processing BTC transaction ${tx.transactionHash}`);
        console.log('Transaction details:', {
          txNumber: tx.txNumber,
          effect: tx.effect,
          type: tx.type,
          walletAddress: tx.walletAddress,
          thirdPartyAddress: tx.thirdPartyAddress
        });
        
        // Create or update source wallet
        if (tx.walletAddress) {
          const sourceWalletResult = await e.select(e.Wallet, (wallet) => ({
            filter: e.op(wallet.address, '=', tx.walletAddress),
          })).run(client);

          if (!sourceWalletResult.length) {
            console.log(`Creating source wallet for address ${tx.walletAddress}`);
            await e.insert(e.Wallet, {
              address: tx.walletAddress,
              type: 'EOA',
              balance: Math.abs(tx.effect),
              currency: e.select(e.Currency, (currency) => ({
                filter_single: e.op(currency.symbol, '=', 'BTC'),
              })),
            }).run(client);
          }
        }

        // Create or update destination wallet
        if (tx.thirdPartyAddress && tx.thirdPartyAddress !== 'the-void') {
          const destWalletResult = await e.select(e.Wallet, (wallet) => ({
            filter: e.op(wallet.address, '=', tx.thirdPartyAddress),
          })).run(client);

          if (!destWalletResult.length) {
            console.log(`Creating destination wallet for address ${tx.thirdPartyAddress}`);
            await e.insert(e.Wallet, {
              address: tx.thirdPartyAddress,
              type: 'EOA',
              balance: Math.abs(tx.effect),
              currency: e.select(e.Currency, (currency) => ({
                filter_single: e.op(currency.symbol, '=', 'BTC'),
              })),
            }).run(client);
          }
        }

        // For fee transactions, use the source wallet as both source and destination
        const isFeeTransaction = tx.type === 'Inner fee';
        let sourceWallet = tx.walletAddress;
        let destinationWallet = tx.thirdPartyAddress || tx.walletAddress;

        // Special handling for fee transactions
        if (isFeeTransaction) {
          // For fee transactions, we need to find the source wallet from previous transactions
          const previousTx = btcTransactions.find(t => 
            t.transactionHash === tx.transactionHash && 
            t.txNumber < tx.txNumber && 
            t.type === 'Inner'
          );
          
          if (previousTx) {
            sourceWallet = previousTx.walletAddress;
            destinationWallet = previousTx.walletAddress;
          } else {
            console.log('Skipping fee transaction - could not find source wallet');
            continue;
          }
        }

        if (!sourceWallet || !destinationWallet) {
          console.log('Skipping transaction due to missing wallet addresses');
          continue;
        }

        // Create transaction with unique hash for each record
        const uniqueHash = `${tx.transactionHash}-${tx.txNumber}`;
        console.log(`Creating BTC transaction ${uniqueHash}`);
        await e.insert(e.Transaction, {
          hash: uniqueHash,
          value: Math.abs(tx.effect).toString(),
          sourceWallet: e.select(e.Wallet, (wallet) => ({
            filter_single: e.op(wallet.address, '=', sourceWallet),
          })),
          destinationWallet: e.select(e.Wallet, (wallet) => ({
            filter_single: e.op(wallet.address, '=', destinationWallet),
          })),
          input: '0x',
          transactionIndex: tx.txNumber,
          gas: 0,
          gasUsed: 0,
          gasPrice: 0,
          transactionFee: isFeeTransaction ? Math.abs(tx.effect) : 0,
          blockNumber: 0,
          blockHash: '',
          blockTimestamp: new Date(tx.date),
        }).run(client);

        console.log(`Successfully created BTC transaction ${uniqueHash}`);
      } catch (error) {
        console.error(`Error processing BTC transaction ${tx.transactionHash}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processBtcTransactions:', error);
    throw error;
  }
}

export async function seedDeribitWallet() {
  console.log('🌱 Starting deribit wallet seed...');
  console.time('⏱️ Deribit seed time');

  try {
    // Clear the entire database first
    await clearDatabase();
    
    // Process ETH transactions
    const ethCsvFilePath = path.resolve(__dirname, 'csv-data/eth_transactions.csv');
    console.log('Processing ETH transactions from:', ethCsvFilePath);
    
    const processEthFile = async () => {
      try {
        if (!fs.existsSync(ethCsvFilePath)) {
          throw new Error(`ETH CSV file not found at path: ${ethCsvFilePath}`);
        }

        const fileContent = await fs.promises.readFile(ethCsvFilePath, 'utf-8');
        console.log('Successfully read ETH CSV file, content length:', fileContent.length);
        
        const records = await new Promise((resolve, reject) => {
          parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
          }, (err, records) => {
            if (err) {
              console.error('Error parsing ETH CSV:', err);
              reject(err);
            } else {
              console.log('Successfully parsed ETH CSV, number of records:', records.length);
              resolve(records);
            }
          });
        });

        const deribitWallet: DeribitWalletData[] = (records as any[]).map((record) => ({
          transactionHash: record['Transaction Hash'],
          blockNumber: parseInt(record['Blockno']),
          timestamp: parseInt(record['UnixTimestamp']),
          dateTime: record['DateTime (UTC)'],
          from: record['From'],
          to: record['To'],
          contractAddress: record['ContractAddress'],
          valueIn: parseFloat(record['Value_IN(ETH)']),
          valueOut: parseFloat(record['Value_OUT(ETH)']),
          currentValue: parseFloat(record['CurrentValue @ $1843.94523908609/Eth']),
          txnFee: parseFloat(record['TxnFee(ETH)']),
          txnFeeUSD: parseFloat(record['TxnFee(USD)']),
          historicalPrice: parseFloat(record['Historical $Price/Eth']),
          status: record['Status'],
          errCode: record['ErrCode'],
          method: record['Method'],
        }));

        console.log('Processed ETH wallet data, number of transactions:', deribitWallet.length);

        // Create ETH currency
        console.log('Creating ETH currency...');
        await e.insert(e.Currency, {
          symbol: 'ETH',
          name: 'Ethereum',
          iconImg: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        }).run(client);

        // Process ETH transactions
        for (const transaction of deribitWallet) {
          try {
            console.log(`Processing ETH transaction ${transaction.transactionHash}`);
            
            // Create or update source wallet
            const sourceWalletResult = await e.select(e.Wallet, (wallet) => ({
              filter: e.op(wallet.address, '=', transaction.from),
            })).run(client);

            if (!sourceWalletResult.length) {
              console.log(`Creating source wallet for address ${transaction.from}`);
              await e.insert(e.Wallet, {
                address: transaction.from,
                type: 'EOA',
                balance: transaction.valueOut,
                currency: e.select(e.Currency, (currency) => ({
                  filter_single: e.op(currency.symbol, '=', 'ETH'),
                })),
              }).run(client);
            }

            // Create or update destination wallet
            const destWalletResult = await e.select(e.Wallet, (wallet) => ({
              filter: e.op(wallet.address, '=', transaction.to),
            })).run(client);

            if (!destWalletResult.length) {
              console.log(`Creating destination wallet for address ${transaction.to}`);
              await e.insert(e.Wallet, {
                address: transaction.to,
                type: 'EOA',
                balance: transaction.valueIn,
                currency: e.select(e.Currency, (currency) => ({
                  filter_single: e.op(currency.symbol, '=', 'ETH'),
                })),
              }).run(client);
            }

            // Create transaction
            console.log(`Creating ETH transaction ${transaction.transactionHash}`);
            await e.insert(e.Transaction, {
              hash: transaction.transactionHash,
              value: transaction.valueOut.toString(),
              sourceWallet: e.select(e.Wallet, (wallet) => ({
                filter_single: e.op(wallet.address, '=', transaction.from),
              })),
              destinationWallet: e.select(e.Wallet, (wallet) => ({
                filter_single: e.op(wallet.address, '=', transaction.to),
              })),
              input: '0x',
              transactionIndex: 0,
              gas: 21000,
              gasUsed: 21000,
              gasPrice: transaction.txnFee / 21000,
              transactionFee: transaction.txnFee,
              blockNumber: transaction.blockNumber,
              blockHash: '',
              blockTimestamp: new Date(transaction.timestamp * 1000),
            }).run(client);

            console.log(`Successfully created ETH transaction ${transaction.transactionHash}`);
          } catch (error) {
            console.error(`Error processing ETH transaction ${transaction.transactionHash}:`, error);
          }
        }
        
        console.log(`Successfully processed ${deribitWallet.length} ETH transactions`);
        return deribitWallet;
      } catch (error) {
        console.error('Error in processEthFile:', error);
        throw error;
      }
    };

    // Process BTC transactions
    const btcCsvFilePath = path.resolve(__dirname, 'csv-data/btc_transactions.csv');
    if (fs.existsSync(btcCsvFilePath)) {
      await processBtcTransactions(btcCsvFilePath);
    } else {
      console.log('BTC CSV file not found, skipping BTC transactions');
    }

    // Process ETH transactions
    await processEthFile();

    console.timeEnd('⏱️ Deribit seed time');
    console.log('✅ Deribit seed completed!');
  } catch (error) {
    console.error('❌ Deribit seed failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the deribit seed if this file is run directly
if (require.main === module) {
  seedDeribitWallet()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
  