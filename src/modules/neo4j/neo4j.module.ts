import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Neo4jService } from './neo4j.service';
import { Neo4jConstraintsInitializer } from './init/constraints';

@Module({})
export class Neo4jModule {
  static forRoot(): DynamicModule {
    return {
      module: Neo4jModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: Neo4jService,
          useFactory: (configService: ConfigService) => {
            return new Neo4jService(configService);
          },
          inject: [ConfigService],
        },
        Neo4jConstraintsInitializer
      ],
      exports: [Neo4jService],
      global: true // Make the module global
    };
  }
}