import type { OpenAPIObject, OperationObject } from '@nestjs/swagger';

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

// The validation pipe's shape: `message` is one entry per failed field.
const VALIDATION_FAILED = {
  description: 'Body failed validation',
  content: {
    'application/json': {
      example: {
        message: ['email: Invalid email address'],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  },
};

// Passport's own 401, which omits the `error` key our exceptions carry.
const NOT_AUTHENTICATED = {
  description: 'Missing or invalid token',
  content: {
    'application/json': {
      example: { message: 'Unauthorized', statusCode: 401 },
    },
  },
};

// Every route that takes a body can fail validation, and every guarded route
// can be called without a token. Deriving both from the finished document beats
// repeating two decorators per route — and it cannot drift, because the
// document is the same one Scalar renders. A route that documents its own 400
// or 401 keeps it.
export function addStandardErrorResponses(document: OpenAPIObject): void {
  for (const pathItem of Object.values(document.paths)) {
    for (const method of METHODS) {
      const operation = pathItem[method] as OperationObject | undefined;
      if (!operation?.responses) continue;

      if (operation.requestBody && !operation.responses['400']) {
        operation.responses['400'] = VALIDATION_FAILED;
      }
      if (operation.security?.length && !operation.responses['401']) {
        operation.responses['401'] = NOT_AUTHENTICATED;
      }
    }
  }
}
