import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { pinoConfig } from 'src/common/logger/logger.config';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { EdgeDBModule } from './edgedb/edgedb.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
// import { Neo4jModule } from './neo4j/neo4j.module';

const FEATURE_MODULES = [
  UserModule,
  EdgeDBModule,
  AuthModule,
  WalletModule,
  TransactionModule,
  // Neo4jModule,
];
const SHARED_MODULES = [
  ConfigModule.forRoot({
    isGlobal: true,
  }),
  LoggerModule.forRoot({
    pinoHttp: pinoConfig,
  }),
];

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
  imports: [...FEATURE_MODULES, ...SHARED_MODULES],
})
export class AppModule {}
