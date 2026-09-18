import type { CreateUserDto } from '../users/_utils/dtos/requests/create-user.dto.js';
import { UserRoleEnum } from '../users/_utils/types/user-role.enum.js';

export interface SeedUser {
  dto: CreateUserDto;
  role: UserRoleEnum;
}

export const seedUsers: SeedUser[] = [
  {
    dto: {
      firstName: 'Admin',
      lastName: 'Boilerplate',
      email: 'admin@example.com',
      password: 'Admin1234!',
    },
    role: UserRoleEnum.ADMIN,
  },
  {
    dto: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'Passw0rd!',
    },
    role: UserRoleEnum.USER,
  },
];
