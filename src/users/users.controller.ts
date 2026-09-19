import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { UsersService } from './users.service.js';
import { GetUserDto } from './_utils/dtos/responses/get-user.dto.js';
import { UpdateProfilePictureDto } from './_utils/dtos/requests/update-profile-picture.dto.js';
import { UserRoleEnum } from './_utils/types/user-role.enum.js';
import { PROFILE_PICTURE_MAX_SIZE } from './_utils/users.constants.js';
import type { UserDocument } from './users.schema.js';
import { Protect } from '../auth/_utils/decorators/protect.decorator.js';
import { ConnectedUser } from '../auth/_utils/decorators/connected-user.decorator.js';
import { FormDataRequest } from '../s3/_utils/decorators/form-data-request.decorator.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ZodResponse({ type: GetUserDto })
  getMe(@ConnectedUser() user: UserDocument): Promise<GetUserDto> {
    return this.usersService.getMe(user);
  }

  @Put('me/profile-picture')
  @FormDataRequest({
    files: [{ name: 'file' }],
    maxFileSize: PROFILE_PICTURE_MAX_SIZE,
  })
  @ZodResponse({ type: GetUserDto })
  updateProfilePicture(
    @ConnectedUser() user: UserDocument,
    @Body() dto: UpdateProfilePictureDto,
  ): Promise<GetUserDto> {
    return this.usersService.updateProfilePicture(user, dto);
  }

  @Delete('me/profile-picture')
  @ZodResponse({ type: GetUserDto })
  removeProfilePicture(
    @ConnectedUser() user: UserDocument,
  ): Promise<GetUserDto> {
    return this.usersService.removeProfilePicture(user);
  }

  @Get()
  @Protect(UserRoleEnum.ADMIN)
  @ZodResponse({ type: [GetUserDto] })
  findAll(): Promise<GetUserDto[]> {
    return this.usersService.findAll();
  }
}
