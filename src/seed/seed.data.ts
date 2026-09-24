import { UserRoleEnum } from '../users/_utils/types/user-role.enum.js';

export const SEED_API_RESOURCE_NAME = 'NestJS Boilerplate API';

// Traditional app allowed to exchange a Management API subject token for a
// user access token: what `pnpm jwt <email>` uses. Dev only.
export const DEV_TOKEN_APP_NAME = 'NestJS Boilerplate - dev tokens';

// Logto's "Custom JWT" for user access tokens: puts the user's role names in
// a `roles` claim, read by JwtAuthGuard. It replaces any existing script.
export const ACCESS_TOKEN_CLAIMS_SCRIPT = `const getCustomJwtClaims = async ({ context }) => ({
  roles: (context.user.roles ?? []).map((role) => role.name),
});`;

export const seedRoles = [
  {
    name: UserRoleEnum.USER,
    description: 'Every user (assigned automatically on sign-up)',
    isDefault: true,
  },
  {
    name: UserRoleEnum.ADMIN,
    description: 'Administrators',
    isDefault: false,
  },
];

// Logto's default password policy rejects known-breached passwords.
export const seedUsers = [
  {
    email: 'admin@example.com',
    name: 'Admin Boilerplate',
    password: 'Adm1n-Boilerplate!',
    roles: [UserRoleEnum.ADMIN],
  },
  {
    email: 'john.doe@example.com',
    name: 'John Doe',
    password: 'J0hn-Doe-Boilerplate!',
    roles: [UserRoleEnum.USER],
  },
];
