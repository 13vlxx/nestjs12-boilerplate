import { ScopeEnum } from '../auth/_utils/types/scope.enum.js';

export const SEED_API_RESOURCE_NAME = 'NestJS Boilerplate API';

export const seedRoles = [
  {
    name: 'admin',
    description: 'Every permission of the API',
    scopes: Object.values(ScopeEnum),
  },
];

// Logto's default password policy rejects known-breached passwords.
export const seedUsers = [
  {
    email: 'admin@example.com',
    name: 'Admin Boilerplate',
    password: 'Adm1n-Boilerplate!',
    roles: ['admin'],
  },
  {
    email: 'john.doe@example.com',
    name: 'John Doe',
    password: 'J0hn-Doe-Boilerplate!',
    roles: [],
  },
];
