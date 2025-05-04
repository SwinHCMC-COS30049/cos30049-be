// import { Injectable } from '@nestjs/common';
// import { Neo4jService } from '../neo4j/neo4j.service';

// @Injectable()
// export class Neo4jTransactionService {
//   constructor(private neo4jService: Neo4jService) {}

//   async fetchGraphData(address?: string) {
//     try {
//       const nodesQuery = `
//         MATCH (w)
//         WHERE w:Source OR w:Destination
//         ${address ? 'WHERE w.addressId = $address' : ''}
//         RETURN DISTINCT w
//         ${!address ? 'LIMIT 50' : ''}
//       `;

//       const relationshipsQuery = `
//         MATCH (w)
//         WHERE (w:Source OR w:Destination)
//         ${address ? 'AND w.addressId = $address' : ''}
//         WITH w
//         MATCH (source:Source)-[tx:Transaction]->(dest:Destination)
//         WHERE source = w OR dest = w
//         WITH DISTINCT source, tx, dest
//         RETURN source, tx, dest
//         ${!address ? 'LIMIT 100' : ''}
//       `;

//     const [nodesResult, relationshipsResult] = await Promise.all([
//       this.neo4jService.read(nodesQuery, address ? { address } : {}),
//       this.neo4jService.read(relationshipsQuery, address ? { address } : {})
//     ]);

//     const nodes = nodesResult.records.map(record => {
//       const node = record.get('w').properties;
//       const type = node.type;
//       return {
//         id: node.addressId,
//         address: node.addressId,
//         type: type,
//         data: {
//           address: node.addressId,
//           type: type
//         }
//       };
//     });

//     const relationships = relationshipsResult.records.map(record => ({
//       source: record.get('source').properties.addressId,
//       target: record.get('dest').properties.addressId,
//       value: record.get('tx').properties.value,
//       timestamp: record.get('tx').properties.block_timestamp,
//       hash: record.get('tx').properties.hash
//     }));

//     return { nodes, relationships };
//   }
//   catch (error) {
//       throw error;
//     }
//   }
// }
