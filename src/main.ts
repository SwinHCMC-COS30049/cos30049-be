import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ConfigService } from '@nestjs/config';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { patchNestJsSwagger } from 'nestjs-zod';
import { NestExpressApplication } from '@nestjs/platform-express';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

function createSwagger(app: INestApplication) {
  const configService = app.get(ConfigService);
  const SWAGGER_API_TITLE = configService.getOrThrow('SWAGGER_API_TITLE');
  const SWAGGER_API_DESCRIPTION = configService.getOrThrow(
    'SWAGGER_API_DESCRIPTION',
  );
  const SWAGGER_API_VERSION = configService.getOrThrow('SWAGGER_API_VERSION');
  const SWAGGER_API_PREFIX = configService.getOrThrow('SWAGGER_API_PREFIX');
  const options = new DocumentBuilder()
    .setTitle(SWAGGER_API_TITLE)
    .setDescription(SWAGGER_API_DESCRIPTION)
    .setVersion(SWAGGER_API_VERSION)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(SWAGGER_API_PREFIX, app, document, {
    jsonDocumentUrl: `${process.env.SWAGGER_API_PREFIX}/json`,
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    cors: true,
  });

  // Environment Variables
  const GLOBAL_API_PREFIX = app
    .get(ConfigService)
    .getOrThrow('GLOBAL_API_PREFIX');

  const PORT = app.get(ConfigService).getOrThrow('PORT');

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(GLOBAL_API_PREFIX);
  app.useGlobalInterceptors(
    new LoggerErrorInterceptor(),
    new ResponseInterceptor(new Reflector()),
  );
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Hot Module Replacement
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }

  // Patching Swagger with Zod
  patchNestJsSwagger();

  // Swagger
  createSwagger(app);

  await app.listen(PORT, '0.0.0.0');
}

bootstrap();
