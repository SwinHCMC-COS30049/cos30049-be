// import { map, mapSeries } from 'bluebird';
// import e from '@dbschema/edgeql-js';
// import { client } from './seeder';
// import { exchangeRates } from './exchange-rate.data';

// export const seedExchangeRates = async () => {
//   console.log(`📈 Seeding exchange rates between cryptos...`);

//   const compositeQueries = await map(exchangeRates, async (rate) => {
//     const selectBaseCurrencyQuery = e.select(e.Currency, () => ({
//       ...e.Currency['*'],
//       filter_single: { symbol: rate.baseCurrency },
//     }));

//     const selectDestinationCurrencyQuery = e.select(e.Currency, () => ({
//       ...e.Currency['*'],
//       filter_single: { symbol: rate.destinationCurrency },
//     }));

//     const insertExchangeRateQueryFromBaseToDst = e.insert(e.ExchangeRate, {
//       ratio: rate.ratio,
//       baseCurrency: selectBaseCurrencyQuery,
//       destinationCurrency: selectDestinationCurrencyQuery,
//       updatedAt: new Date(),
//     });

//     const insertExchangeRateQueryFromDstToBase = e.insert(e.ExchangeRate, {
//       ratio: 1 / rate.ratio,
//       baseCurrency: selectDestinationCurrencyQuery,
//       destinationCurrency: selectBaseCurrencyQuery,
//       updatedAt: new Date(),
//     });

//     return [
//       insertExchangeRateQueryFromBaseToDst.toEdgeQL(),
//       insertExchangeRateQueryFromDstToBase.toEdgeQL(),
//     ];
//   });

//   const queries = compositeQueries.flat();

//   await client.transaction(async (tx) => {
//     return await mapSeries(queries, async (query) => {
//       await tx.querySingle(query);
//     });
//   });

//   console.log('📈 Crypto exchange rates seeded!');
// };


import e from '@dbschema/edgeql-js';
import { client as edgeClient } from '../seeder/seeder';
import { map } from 'bluebird';
import { Neo4jService } from '../../modules/neo4j/neo4j.service';
import { exchangeRates } from './exchange-rate.data';

// Function to seed exchange rates in EdgeDB
const seedExchangeRatesInEdgeDB = async () => {
  console.log('📈 Seeding exchange rates into EdgeDB...');

  const queries = await map(exchangeRates, async (rate) => {
    const baseCurrency = await e
      .select(e.Currency, (currency) => ({
        filter_single: { symbol: rate.baseCurrency },
      }))
      .assert_single()
      .run(edgeClient);

    const destinationCurrency = await e
      .select(e.Currency, (currency) => ({
        filter_single: { symbol: rate.destinationCurrency },
      }))
      .assert_single()
      .run(edgeClient);

    if (!baseCurrency || !destinationCurrency) {
      console.error('Base or destination currency not found for', rate);
      return null;
    }

    const insertExchangeRateQuery = e.insert(e.ExchangeRate, {
      ratio: rate.ratio,
      updatedAt: new Date(),
      baseCurrency: e.select(e.Currency, () => ({
        filter_single: { id: baseCurrency.id },
      })),
      destinationCurrency: e.select(e.Currency, () => ({
        filter_single: { id: destinationCurrency.id },
      })),
    });

    return insertExchangeRateQuery.toEdgeQL();
  });

  const validQueries = queries.filter(query => query !== null);

  await edgeClient.transaction(async (tx) => {
    for (const query of validQueries) {
      if (query) {
        await tx.querySingle(query);
      }
    }
  });

  console.log('📈 Exchange rates seeded into EdgeDB!');
};

// Function to seed exchange rates in Neo4j
const seedExchangeRatesInNeo4j = async (neo4jService: Neo4jService) => {
  console.log('📈 Seeding exchange rates into Neo4j...');
  for (const rate of exchangeRates) {
    await neo4jService.write(`
      MATCH (base:Currency {symbol: $baseCurrency})
      MATCH (dest:Currency {symbol: $destinationCurrency})
      CREATE (e:ExchangeRate {
        ratio: $ratio,
        timestamp: datetime()
      })
      CREATE (base)-[:BASE_CURRENCY]->(e)
      CREATE (dest)-[:QUOTE_CURRENCY]->(e)
    `, {
      baseCurrency: rate.baseCurrency,
      destinationCurrency: rate.destinationCurrency,
      ratio: rate.ratio
    });
  }
  console.log('📈 Exchange rates seeded into Neo4j!');
};

// Combined seeder function
export const seedExchangeRates = async (neo4jService: Neo4jService) => {
  // Seed exchange rates in both databases
  await seedExchangeRatesInEdgeDB();
  await seedExchangeRatesInNeo4j(neo4jService);
};