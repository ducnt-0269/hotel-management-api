import { SetMetadata } from '@nestjs/common';

// JwtAuthGuard is global, so routes opt out of authentication explicitly.
export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
