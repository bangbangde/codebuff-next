export const USER_ROLE = {
  ADMIN: "admin",
  USER: "user",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const userRoleField = {
  type: "string",
  required: true,
  defaultValue: USER_ROLE.USER,
  input: false,
} as const;

export function hasAdminRole(role: unknown): role is typeof USER_ROLE.ADMIN {
  return role === USER_ROLE.ADMIN;
}
