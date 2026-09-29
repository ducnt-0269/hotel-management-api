// Every role and account state a user can have; the DB CHECKs on `users`
// list the same values.
export const USER_ROLES = ['user', 'admin'] as const;
export const USER_STATUSES = ['unverified', 'active', 'deactivated'] as const;
