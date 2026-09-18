import { createZodDto } from 'nestjs-zod';
import { createUserSchema } from '../../../../users/_utils/dtos/requests/create-user.dto.js';

export class RegisterDto extends createZodDto(createUserSchema) {}
