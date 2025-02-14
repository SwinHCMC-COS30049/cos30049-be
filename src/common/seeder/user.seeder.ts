// import e from '@dbschema/edgeql-js';
// import { CreateUserInput } from 'src/modules/user/user.dto';
// import { faker } from '@faker-js/faker';
// import { client } from './seeder';
// import { hash } from 'bcrypt';
// import { BCRYPT_SALT_ROUNDS } from 'src/modules/auth/auth.const';
// import { map, mapSeries } from 'bluebird';
// import { normalizeEmail } from 'validator';

// const getDummyUser = async (): Promise<Required<CreateUserInput>> => {
//   return {
//     email: faker.internet.email(),
//     password: await hash('password', BCRYPT_SALT_ROUNDS),
//     firstName: faker.person.firstName(),
//     lastName: faker.person.lastName(),
//     address: faker.location.streetAddress(),
//     phone: faker.phone.number(),
//     profileImg: faker.image.avatar(),
//   };
// };

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// export const seedUsers = async (count: number = 10) => {
//   console.log(`👤 Seeding ${count} users...`);

//   const queries = await map(Array.from({ length: count }), async () => {
//     const user = await getDummyUser();
//     const insertUserQuery = e
//       .insert(e.User, {
//         ...user,
//         normalizedEmail: normalizeEmail(user.email) || user.email,
//       })
//       // If another user with the same normalize email already exists, return null
//       .unlessConflict((user) => ({
//         on: user.normalizedEmail,
//       }));

//     return insertUserQuery.toEdgeQL();
//   });

//   await client.transaction(async (tx) => {
//     return await mapSeries(queries, async (query) => {
//       await tx.querySingle(query);
//     });
//   });

//   console.log('👤 Users seeded!');
// };


import e from '@dbschema/edgeql-js';
import { CreateUserInput } from 'src/modules/user/user.dto';
import { faker } from '@faker-js/faker';
import { client as edgeClient } from './seeder';
import { hash } from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from 'src/modules/auth/auth.const';
import { map, mapSeries } from 'bluebird';
import { normalizeEmail } from 'validator';
import { Neo4jService } from '../../modules/neo4j/neo4j.service';

// Function to generate a dummy user
const getDummyUser = async (): Promise<Required<CreateUserInput>> => {
  return {
    email: faker.internet.email(),
    password: await hash('password', BCRYPT_SALT_ROUNDS),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    address: faker.location.streetAddress(),
    phone: faker.phone.number(),
    profileImg: faker.image.avatar(),
  };
};

// Function to seed users in EdgeDB
const seedUsersInEdgeDB = async (count: number) => {
  console.log(`👤 Seeding ${count} users into EdgeDB...`);

  const queries = await map(Array.from({ length: count }), async () => {
    const user = await getDummyUser();
    const insertUserQuery = e
      .insert(e.User, {
        ...user,
        normalizedEmail: normalizeEmail(user.email) || user.email,
      })
      // If another user with the same normalized email already exists, return null
      .unlessConflict((user) => ({
        on: user.normalizedEmail,
      }));

    return insertUserQuery.toEdgeQL();
  });

  await edgeClient.transaction(async (tx) => {
    return await mapSeries(queries, async (query) => {
      await tx.querySingle(query);
    });
  });

  console.log('👤 Users seeded into EdgeDB!');
};

// Function to seed users in Neo4j
const seedUsersInNeo4j = async (neo4jService: Neo4jService, count: number) => {
  console.log(`👤 Seeding ${count} users into Neo4j...`);

  for (let i = 0; i < count; i++) {
    const user = await getDummyUser();
    const normalizedEmail = normalizeEmail(user.email) || user.email;

    await neo4jService.write(`
      MERGE (u:User {normalizedEmail: $normalizedEmail})
      ON CREATE SET
        u.email = $email,
        u.password = $password,
        u.firstName = $firstName,
        u.lastName = $lastName,
        u.address = $address,
        u.phone = $phone,
        u.profileImg = $profileImg,
        u.id = randomUUID()
    `, {
      ...user,
      normalizedEmail
    });
  }
  console.log('👤 Users seeded into Neo4j!');
};

// Combined seeder function
export const seedUsers = async (
  neo4jService: Neo4jService,
  count: number = 10
) => {
  // Seed users in both databases
  await seedUsersInEdgeDB(count);
  await seedUsersInNeo4j(neo4jService, count);
};