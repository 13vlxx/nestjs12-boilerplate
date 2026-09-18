import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { UsersService } from './users.service.js';
import { GetUserDto } from './_utils/dtos/responses/get-user.dto.js';
import { UserRoleEnum } from './_utils/types/user-role.enum.js';
import type { UserDocument } from './users.schema.js';
import { Protect } from '../auth/_utils/decorators/protect.decorator.js';
import { ConnectedUser } from '../auth/_utils/decorators/connected-user.decorator.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Protect()
  @Get('me')
  @ZodResponse({ type: GetUserDto })
  getMe(@ConnectedUser() user: UserDocument): GetUserDto {
    return this.usersService.getMe(user);
  }

  @Protect(UserRoleEnum.ADMIN)
  @Get()
  @ZodResponse({ type: [GetUserDto] })
  findAll(): Promise<GetUserDto[]> {
    return this.usersService.findAll();
  }
}
