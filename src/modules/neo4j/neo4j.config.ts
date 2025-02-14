// import { registerAs } from '@nestjs/config';

// export default registerAs('neo4j', () => ({
//   scheme: process.env.NEO4J_SCHEME || 'neo4j',
//   host: process.env.NEO4J_HOST || 'localhost',
//   port: parseInt(process.env.NEO4J_PORT || '7689', 10),
//   username: process.env.NEO4J_USERNAME || 'neo4j',
//   password: process.env.NEO4J_PASSWORD, 
//   database: process.env.NEO4J_DATABASE || 'neo4j',
// }));


import { registerAs } from '@nestjs/config';

export default registerAs('neo4j', () => ({
  uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
  username: process.env.NEO4J_USERNAME || 'neo4j',
  password: process.env.NEO4J_PASSWORD,
  database: process.env.NEO4J_DATABASE || 'neo4j',
}));