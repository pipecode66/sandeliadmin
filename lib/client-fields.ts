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
  "avatar",
  "avatar_type",
  "user_code",
  "created_at",
  "password_set",
].join(",")

export const CLIENT_PASSWORD_RULE =
  "La contraseña debe tener exactamente 6 caracteres e incluir una mayuscula, un numero y un caracter especial."

export function isValidSimplePassword(password: string) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6}$/.test(password)
}
