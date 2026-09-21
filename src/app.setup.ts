import {
  type INestApplication,
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Global wiring shared by `main.ts` and the e2e harness so tests exercise
// exactly what production runs.
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalInterceptors(
    new StandardSchemaSerializerInterceptor(app.get(Reflector)),
  );
}
