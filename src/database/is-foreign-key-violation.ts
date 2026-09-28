import { QueryFailedError } from 'typeorm';

// Postgres `foreign_key_violation`: a DELETE would leave rows elsewhere
// pointing at nothing, typically because they reference the row being removed.
const FOREIGN_KEY_VIOLATION = '23503';

export function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === FOREIGN_KEY_VIOLATION
  );
}
