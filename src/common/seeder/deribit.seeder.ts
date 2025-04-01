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

async function clearDatabase() {
  console.log('🧹 Clearing entire database...');
  await e.delete(e.Transaction).run(client);
  await e.delete(e.Wallet).run(client);
  await e.delete(e.User).run(client);
  await e.delete(e.ExchangeRate).run(client);
  await e.delete(e.Currency).run(client);
  console.log('🧹 Database cleared!');
}

export async function seedDeribitWallet() {
  console.log('🌱 Starting deribit wallet seed...');
  console.time('⏱️ Deribit seed time');

  try {
    // Clear the entire database first
    await clearDatabase();
    
    // Use resolve to get absolute path
    const csvFilePath = path.resolve(__dirname, 'csv-data/export-0x58F56615180A8eeA4c462235D9e215F72484B4A3.csv');
    
    console.log('Attempting to read CSV file from:', csvFilePath);
    
    const processFile = async () => {
      try {
        // Check if file exists
        if (!fs.existsSync(csvFilePath)) {
          throw new Error(`CSV file not found at path: ${csvFilePath}`);
        }

        // Read file using promises
        const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8');
        console.log('Successfully read CSV file, content length:', fileContent.length);
        
        // Parse CSV using promises
        const records = await new Promise((resolve, reject) => {
          parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
          }, (err, records) => {
            if (err) {
              console.error('Error parsing CSV:', err);
              reject(err);
            } else {
              console.log('Successfully parsed CSV, number of records:', records.length);
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

        console.log('Processed wallet data, number of transactions:', deribitWallet.length);
        console.log('Sample transaction hash:', deribitWallet[0]?.transactionHash);

        // Create ETH currency first
        console.log('Creating ETH currency...');
        await e.insert(e.Currency, {
          symbol: 'ETH',
          name: 'Ethereum',
          iconImg: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        }).run(client);

        // Create or update wallets and transactions
        for (const transaction of deribitWallet) {
          try {
            console.log(`Processing transaction ${transaction.transactionHash}`);
            
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
            console.log(`Creating transaction ${transaction.transactionHash}`);
            await e.insert(e.Transaction, {
              hash: transaction.transactionHash,
              value: transaction.valueOut.toString(),
              sourceWallet: e.select(e.Wallet, (wallet) => ({
                filter_single: e.op(wallet.address, '=', transaction.from),
              })),
              destinationWallet: e.select(e.Wallet, (wallet) => ({
                filter_single: e.op(wallet.address, '=', transaction.to),
              })),
              input: '0x', // Default input for ETH transfers
              transactionIndex: 0, // Default value since not in CSV
              gas: 21000, // Standard ETH transfer gas
              gasUsed: 21000,
              gasPrice: transaction.txnFee / 21000, // Calculate from txnFee
              transactionFee: transaction.txnFee,
              blockNumber: transaction.blockNumber,
              blockHash: '', // Not available in CSV
              blockTimestamp: new Date(transaction.timestamp * 1000),
            }).run(client);

            console.log(`Successfully created transaction ${transaction.transactionHash}`);
          } catch (error) {
            console.error(`Error processing transaction ${transaction.transactionHash}:`, error);
            // Continue with next transaction even if one fails
          }
        }
        
        console.log(`Successfully processed ${deribitWallet.length} deribit wallet transactions`);
        return deribitWallet;
      } catch (error) {
        console.error('Error in processFile:', error);
        throw error;
      }
    };

    const result = await processFile();
    console.timeEnd('⏱️ Deribit seed time');
    console.log('✅ Deribit seed completed!');
    return result;
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
  