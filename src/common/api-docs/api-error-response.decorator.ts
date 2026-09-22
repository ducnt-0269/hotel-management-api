import { ApiResponse } from '@nestjs/swagger';

const REASON: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
};

// Documents one failure the way the API actually returns it: NestJS's default
// `{ message, error, statusCode }`. The message doubles as the description, so
// there is one string to keep true instead of two.
export function ApiErrorResponse(status: number, message: string) {
  return ApiResponse({
    status,
    description: message,
    schema: { example: { message, error: REASON[status], statusCode: status } },
  });
}
