import { map, mapSeries } from 'bluebird';
import { currencies } from './currency.data';
import e from '@dbschema/edgeql-js';
import { client as edgeClient } from './seeder';
import { Neo4jService } from '../../modules/neo4j/neo4j.service';

// Function to seed currencies in EdgeDB
const seedCurrenciesInEdgeDB = async () => {
  console.log(`💵 Seeding ${currencies.length} currencies into EdgeDB...`);

  const queries = await map(currencies, async (currency) => {
    const insertCurrencyQuery = e.insert(e.Currency, {
      ...currency,
    });

    return insertCurrencyQuery.toEdgeQL();
  });

  await edgeClient.transaction(async (tx) => {
    return await mapSeries(queries, async (query) => {
      await tx.querySingle(query);
    });
  });

  console.log('💵 Currencies seeded into EdgeDB!');
};

// Function to seed currencies in Neo4j
const seedCurrenciesInNeo4j = async (neo4jService: Neo4jService) => {
  console.log(`💵 Seeding ${currencies.length} currencies into Neo4j...`);

  for (const currency of currencies) {
    await neo4jService.write(`
      MERGE (c:Currency {symbol: $symbol})
      ON CREATE SET
        c.name = $name,
        c.iconImg = $iconImg
    `, currency);
  }

  console.log('💵 Currencies seeded into Neo4j!');
};

// Combined seeder function
export const seedCurrencies = async (
  neo4jService: Neo4jService
) => {
  // Seed currencies in both databases
  await seedCurrenciesInEdgeDB();
  await seedCurrenciesInNeo4j(neo4jService);
};