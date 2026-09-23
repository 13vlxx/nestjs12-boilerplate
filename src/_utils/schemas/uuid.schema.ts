import z from 'zod';

export const uuidSchema = z
  .uuid()
  .meta({ example: '0199a1b2-7c3d-7e4f-8a5b-6c7d8e9f0a1b' });
