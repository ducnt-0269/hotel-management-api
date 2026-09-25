import { QueryFailedError } from 'typeorm';

// Postgres `unique_violation`: the row collided with a UNIQUE constraint or
// index, typically because a concurrent request inserted it first.
const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
  );
}
