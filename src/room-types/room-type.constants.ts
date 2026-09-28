// Length of the `room_types.name` column.
export const MAX_ROOM_TYPE_NAME_LENGTH = 100;

// Largest value a Postgres `integer` column holds: past it, `total_rooms`
// would fail in the database instead of in validation.
export const MAX_TOTAL_ROOMS = 2_147_483_647;
