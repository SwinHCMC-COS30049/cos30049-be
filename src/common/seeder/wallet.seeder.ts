// import e from '@dbschema/edgeql-js';
// import { client } from '../seeder/seeder';
// import { randomNumber } from './seeder.util';
// import { mapSeries } from 'bluebird';
// import { WalletType } from '@dbschema/edgeql-js/modules/default';
// import { generateCryptoAddress } from './wallet.util';

// export const seedWallets = async (
//   maxBalance: number = 1000,
//   // Minimum 2 wallets per currency
//   // to ensure that we have enough wallets to transact between them
//   maxWalletsPerCurrency = 20,
// ) => {
//   const cryptoCurrencies = await e
//     .select(e.Currency, () => ({
//       ...e.Currency['*'],
//     }))
//     .run(client);

//   console.log(`💰 Seeding wallets...`);

//   const insertWalletsQueries = cryptoCurrencies.map((currency) => {
//     const insertWalletQueries: string[] = [];
//     for (let i = 0; i < maxWalletsPerCurrency; i++) {
//       insertWalletQueries.push(
//         e
//           .insert(e.Wallet, {
//             balance: Math.random() * randomNumber(0, maxBalance),
//             currency: e.select(e.Currency, () => ({
//               ...e.Currency['*'],
//               filter_single: { id: currency.id },
//             })),
//             address: generateCryptoAddress(currency.symbol),
//             type: Math.random() > 0.5 ? WalletType.Contract : WalletType.EOA,
//           })
//           .toEdgeQL(),
//       );
//     }

//     return insertWalletQueries;
//   });

//   const flattenedWalletsQueries = insertWalletsQueries.flat();

//   await client.transaction(async (tx) => {
//     return await mapSeries(flattenedWalletsQueries, async (query) => {
//       await tx.querySingle(query);
//     });
//   });

//   console.log(`💰 ${flattenedWalletsQueries.length} wallets seeded!`);
// };


import e from '@dbschema/edgeql-js';
import { client as edgeClient } from '../seeder/seeder';
import { Neo4jService } from '../../modules/neo4j/neo4j.service';
import { generateCryptoAddress, randomNumber } from './seeder.util';
import { mapSeries } from 'bluebird';
import { WalletType } from '@dbschema/edgeql-js/modules/default';

// Function to seed wallets in EdgeDB
const seedWalletsInEdgeDB = async (cryptoCurrencies: any[], maxBalance: number, maxWalletsPerCurrency: number) => {
  console.log(`💰 Seeding wallets into EdgeDB...`);

  const insertWalletsQueries = cryptoCurrencies.map((currency) => {
    const insertWalletQueries: string[] = [];
    for (let i = 0; i < maxWalletsPerCurrency; i++) {
      insertWalletQueries.push(
        e
          .insert(e.Wallet, {
            balance: Math.random() * randomNumber(0, maxBalance),
            currency: e.select(e.Currency, () => ({
              ...e.Currency['*'],
              filter_single: { id: currency.id },
            })),
            address: generateCryptoAddress(currency.symbol),
            type: Math.random() > 0.5 ? WalletType.Contract : WalletType.EOA,
          })
          .toEdgeQL(),
      );
    }
    return insertWalletQueries;
  });

  const flattenedWalletsQueries = insertWalletsQueries.flat();

  await edgeClient.transaction(async (tx) => {
    return await mapSeries(flattenedWalletsQueries, async (query) => {
      await tx.querySingle(query);
    });
  });

  console.log(`💰 ${flattenedWalletsQueries.length} wallets seeded into EdgeDB!`);
};

// Function to seed wallets in Neo4j
const seedWalletsInNeo4j = async (neo4jService: Neo4jService, currencies: any[], maxBalance: number, maxWalletsPerCurrency: number) => {
  console.log('💰 Seeding wallets into Neo4j...');
  let walletCount = 0;

  for (const currency of currencies) {
    for (let i = 0; i < maxWalletsPerCurrency; i++) {
      const address = generateCryptoAddress(currency.symbol);
      const balance = Math.random() * randomNumber(0, maxBalance);
      const type = Math.random() > 0.5 ? 'Contract' : 'EOA';

      await neo4jService.write(`
        MATCH (c:Currency {symbol: $symbol})
        CREATE (w:Wallet {
          address: $address,
          balance: $balance,
          type: $type
        })
        CREATE (w)-[:HAS_CURRENCY]->(c)
      `, {
        symbol: currency.symbol,
        address,
        balance,
        type
      });
      walletCount++;
    }
  }
  console.log(`💰 ${walletCount} wallets seeded into Neo4j!`);
};

// Combined seeder function
export const seedWallets = async (
  neo4jService: Neo4jService,
  maxBalance: number = 1000,
  maxWalletsPerCurrency = 20
) => {
  // Fetch currencies from EdgeDB
  const cryptoCurrencies = await e
    .select(e.Currency, () => ({
      ...e.Currency['*'],
    }))
    .run(edgeClient);

  // Fetch currencies from Neo4j
  const result = await neo4jService.read('MATCH (c:Currency) RETURN c');
  const currencies = result.records.map(record => record.get('c').properties);

  // Seed wallets in both databases
  await seedWalletsInEdgeDB(cryptoCurrencies, maxBalance, maxWalletsPerCurrency);
  await seedWalletsInNeo4j(neo4jService, currencies, maxBalance, maxWalletsPerCurrency);
};