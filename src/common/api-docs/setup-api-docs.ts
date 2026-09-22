import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

import { addStandardErrorResponses } from './standard-error-responses.js';

import type { INestApplication } from '@nestjs/common';

// OpenAPI is generated from code (Zod schemas + decorators), never
// hand-written. `@nestjs/swagger` builds the document; Scalar renders it.
export function setupApiDocs(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Hotel Management API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  addStandardErrorResponses(document);
  app.use('/api/docs', apiReference({ content: document }));
}
