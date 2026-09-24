// Names of the user roles created in Logto (pnpm seed), exposed in the access
// token's `roles` claim by the JWT customizer script.
export enum UserRoleEnum {
  USER = 'user',
  ADMIN = 'admin',
}
