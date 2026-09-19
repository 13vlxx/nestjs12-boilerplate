import { Types } from 'mongoose';
import z from 'zod';

export const objectIdSchema = z
  .string()
  .refine((value) => Types.ObjectId.isValid(value), 'Invalid id')
  .meta({ example: '6aadd2f2e2134eeea1cf082f' });
