import { applyDecorators, SerializeOptions } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';

import type { ApiResponseOptions } from '@nestjs/swagger';
import type { ZodType } from 'zod';

type ResponseSchema = NonNullable<
  Extract<ApiResponseOptions, { schema?: unknown }>['schema']
>;

interface ResponseOptions {
  status: number;
  description: string;
}

// One Zod schema, two jobs: it filters the response at runtime and documents
// the body in OpenAPI. Declaring them together is what keeps `/api/docs` from
// advertising a shape the serializer does not actually produce.
//
// `io: 'output'` describes what leaves the API (after coercion), and
// `unrepresentable: 'any'` stops `z.date()` from throwing — date fields carry
// their own `.meta({ type: 'string', format: 'date-time' })` instead.
export function RespondsWith(
  schema: ZodType,
  { status, description }: ResponseOptions,
) {
  const body = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'output',
    unrepresentable: 'any',
  }) as ResponseSchema;

  return applyDecorators(
    SerializeOptions({ schema }),
    ApiResponse({ status, description, schema: body }),
  );
}
