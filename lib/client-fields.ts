export const CLIENT_PUBLIC_SELECT = [
  "id",
  "email",
  "full_name",
  "phone",
  "address",
  "gender",
  "points",
  "redeemed_today",
  "last_redeem_date",
  "daily_limit_override",
  "avatar",
  "avatar_type",
  "user_code",
  "created_at",
  "password_set",
].join(",")

export const CLIENT_PASSWORD_RULE =
  "La contraseña debe tener al menos 8 caracteres."

export function isValidSimplePassword(password: string) {
  return password.length >= 8
}
