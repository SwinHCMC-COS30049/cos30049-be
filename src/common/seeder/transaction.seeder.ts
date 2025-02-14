// import e from '@dbschema/edgeql-js';
// import { client } from '../seeder/seeder';
// import { map } from 'bluebird';
// import { generateCryptoTransactionData } from './transaction.util';

// export const seedTransactions = async (count: number = 1000) => {
//   console.log(`💸 Seeding transactions...`);

//   // .map can cause errors since transactions run concurrently and they are interdependent
//   // can use .mapSeries to run them sequentially, but it will be slower
//   await map(new Array(count).fill(null), async () => {
//     await seedTransaction();
//   });

//   console.log(`💸 ${count} transactions seeded!`);
// };

// const seedTransaction = async () => {
//   const sourceWallet = await e
//     .select(e.Wallet, () => ({
//       ...e.Wallet['*'],
//       currency: {
//         id: true,
//         symbol: true,
//       },
//       limit: 1,
//       order_by: e.random(),
//     }))
//     .assert_single()
//     .run(client);

//   if (!sourceWallet) {
//     console.error('No wallet found. Please seed wallets first.');
//     return;
//   }

//   const destinationWallet = await e
//     .select(e.Wallet, (wallet) => {
//       const isNotSourceWallet = e.op(wallet.id, '!=', e.uuid(sourceWallet.id));
//       const isSameCurrency = e.op(
//         wallet.currency.id,
//         '=',
//         e.uuid(sourceWallet.currency.id),
//       );

//       return {
//         ...e.Wallet['*'],
//         currency: {
//           id: true,
//           symbol: true,
//         },
//         limit: 1,
//         order_by: e.random(),
//         filter: e.op(isNotSourceWallet, 'and', isSameCurrency),
//       };
//     })
//     .assert_single()
//     .run(client);

//   if (!destinationWallet) {
//     console.error('No wallet found. Please seed wallets first.');
//     return;
//   }

//   const transaction = e.insert(e.Transaction, {
//     ...generateCryptoTransactionData(
//       sourceWallet.currency.symbol,
//       sourceWallet.address,
//       destinationWallet.address,
//     ),
//     sourceWallet: e.select(e.Wallet, () => ({
//       filter_single: { id: sourceWallet.id },
//     })),
//     destinationWallet: e.select(e.Wallet, () => ({
//       filter_single: { id: destinationWallet.id },
//     })),
//   });

//   // const updateSrcWallet = e.update(e.Wallet, () => ({
//   //   filter_single: { id: sourceWallet.id },
//   //   set: {
//   //     balance: sourceWallet.balance - transactedAmount,
//   //   },
//   // }));

//   // const updateDstWallet = e.update(e.Wallet, () => ({
//   //   filter_single: { id: destinationWallet.id },
//   //   set: {
//   //     balance: destinationWallet.balance + transactedAmount,
//   //   },
//   // }));

//   await client.transaction(async (tx) => {
//     await tx.querySingle(transaction.toEdgeQL());
//     // await tx.querySingle(updateSrcWallet.toEdgeQL());
//     // await tx.querySingle(updateDstWallet.toEdgeQL());
//   });
// };


import e from '@dbschema/edgeql-js';
import { client as edgeClient } from '../seeder/seeder';
import { map } from 'bluebird';
import { generateCryptoTransactionData } from './transaction.util';
import { Neo4jService } from '../../modules/neo4j/neo4j.service';
import { faker } from '@faker-js/faker';
import { generateTransactionHash } from './seeder.util';

// Function to seed transactions in EdgeDB
const seedTransactionsInEdgeDB = async (count: number) => {
  console.log(`💸 Seeding transactions into EdgeDB...`);

  // .map can cause errors since transactions run concurrently and they are interdependent
  // can use .mapSeries to run them sequentially, but it will be slower
  await map(new Array(count).fill(null), async () => {
    await seedTransactionInEdgeDB();
  });

  console.log(`💸 ${count} transactions seeded into EdgeDB!`);
};

const seedTransactionInEdgeDB = async () => {
  const sourceWallet = await e
    .select(e.Wallet, () => ({
      ...e.Wallet['*'],
      currency: {
        id: true,
        symbol: true,
      },
      limit: 1,
      order_by: e.random(),
    }))
    .assert_single()
    .run(edgeClient);

  if (!sourceWallet) {
    console.error('No wallet found. Please seed wallets first.');
    return;
  }

  const destinationWallet = await e
    .select(e.Wallet, (wallet) => {
      const isNotSourceWallet = e.op(wallet.id, '!=', e.uuid(sourceWallet.id));
      const isSameCurrency = e.op(
        wallet.currency.id,
        '=',
        e.uuid(sourceWallet.currency.id),
      );

      return {
        ...e.Wallet['*'],
        currency: {
          id: true,
          symbol: true,
        },
        limit: 1,
        order_by: e.random(),
        filter: e.op(isNotSourceWallet, 'and', isSameCurrency),
      };
    })
    .assert_single()
    .run(edgeClient);

  if (!destinationWallet) {
    console.error('No wallet found. Please seed wallets first.');
    return;
  }

  const transaction = e.insert(e.Transaction, {
    ...generateCryptoTransactionData(
      sourceWallet.currency.symbol,
      sourceWallet.address,
      destinationWallet.address,
    ),
    sourceWallet: e.select(e.Wallet, () => ({
      filter_single: { id: sourceWallet.id },
    })),
    destinationWallet: e.select(e.Wallet, () => ({
      filter_single: { id: destinationWallet.id },
    })),
  });

  await edgeClient.transaction(async (tx) => {
    await tx.querySingle(transaction.toEdgeQL());
  });
};

// Function to seed transactions in Neo4j
const seedTransactionsInNeo4j = async (neo4jService: Neo4jService, transactionCount: number) => {
  console.log('💸 Seeding transactions into Neo4j...');
  // Get all wallets
  const result = await neo4jService.read(`
    MATCH (w:Wallet)-[:HAS_CURRENCY]->(c:Currency)
    RETURN w, c
  `);

  const wallets = result.records.map(record => ({
    ...record.get('w').properties,
    currency: record.get('c').properties
  }));

  for (let i = 0; i < transactionCount; i++) {
    const sourceWallet = wallets[Math.floor(Math.random() * wallets.length)];
    const destinationWallet = wallets[Math.floor(Math.random() * wallets.length)];

    if (sourceWallet.address !== destinationWallet.address) {
      const amount = faker.number.float({ min: 0.00001, max: 10, fractionDigits: 5 });
      const timestamp = faker.date.past().getTime();
      
      const hash = generateTransactionHash(
        sourceWallet.currency.symbol,
        sourceWallet.address,
        destinationWallet.address,
        amount,
        timestamp
      );

      await neo4jService.write(`
        MATCH (source:Wallet {address: $sourceAddress})
        MATCH (dest:Wallet {address: $destAddress})
        CREATE (t:Transaction {
          hash: $hash,
          amount: $amount,
          timestamp: datetime($timestamp),
          status: 'COMPLETED'
        })
        CREATE (source)-[:SENT]->(t)
        CREATE (t)-[:RECEIVED]->(dest)
      `, {
        sourceAddress: sourceWallet.address,
        destAddress: destinationWallet.address,
        hash,
        amount,
        timestamp: new Date(timestamp).toISOString()
      });
    }
  }
  console.log(`💸 ${transactionCount} transactions seeded into Neo4j!`);
};

// Combined seeder function
export const seedTransactions = async (
  neo4jService: Neo4jService,
  count: number = 1000
) => {
  // Seed transactions in both databases
  await seedTransactionsInEdgeDB(count);
  await seedTransactionsInNeo4j(neo4jService, count);
};