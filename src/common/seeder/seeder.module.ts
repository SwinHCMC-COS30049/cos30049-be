import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Neo4jModule } from 'src/modules/neo4j/neo4j.module';
import { Neo4jSeederService } from './seeder-neo4j.service';
import { EdgedbSeederService } from './seeder.service';
import neo4jConfig from 'src/modules/neo4j/neo4j.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [neo4jConfig],
      isGlobal: true,
    }),
    Neo4jModule.forRoot(),
  ],
  providers: [EdgedbSeederService, Neo4jSeederService],
  exports: [EdgedbSeederService, Neo4jSeederService],
})
export class SeederModule {}