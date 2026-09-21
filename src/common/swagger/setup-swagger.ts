import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import type { INestApplication } from '@nestjs/common';

// OpenAPI is generated from code (Zod schemas + decorators), never hand-written.
// UI at /api/docs, raw document at /api/docs-json.
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Hotel Management API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
}
