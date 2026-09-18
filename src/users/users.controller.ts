import { Controller } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
