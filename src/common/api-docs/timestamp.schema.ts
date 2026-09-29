import { z } from 'zod';

// A moment in time, sent as an ISO 8601 UTC string. `z.date()` has no JSON
// Schema form, so the meta tells the API docs what the field looks like.
export const timestampSchema = z.date().meta({
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-22T04:08:46.495Z'],
});
