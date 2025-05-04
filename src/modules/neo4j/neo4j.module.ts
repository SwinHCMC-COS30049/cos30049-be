import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Neo4jService } from './neo4j.service';
import { Neo4jController } from './neo4j.controller';
// import { Neo4jConstraintsInitializer } from './init/constraints';
import { Neo4jImportService } from './neo4j-import.service';

@Module({})
export class Neo4jModule {
  static forRoot(): DynamicModule {
    return {
      module: Neo4jModule,
      imports: [ConfigModule],
      // controllers: [Neo4jController],
      controllers: [],
      // providers: [
      //   {
      //     provide: Neo4jService,
      //     useFactory: (configService: ConfigService) => {
      //       return new Neo4jService(configService);
      //     },
      //     inject: [ConfigService],
      //   },
      //   Neo4jConstraintsInitializer,
      //   Neo4jImportService,
      // ],
      // exports: [Neo4jService, Neo4jImportService],
      global: true, // Make the module global
    };
  }
}
