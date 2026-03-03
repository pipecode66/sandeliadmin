-- 008_sync_admin_user.sql
-- Use this in Supabase SQL Editor when you cannot run Node (.mjs) scripts.
-- It syncs an existing Auth user into public.admin_users.
--
-- IMPORTANT:
-- 1) Create the user first in Authentication > Users (Dashboard).
-- 2) Run scripts/007_admin_hierarchy_analytics_notifications.sql first.

DO $$
DECLARE
  v_admin_email TEXT := 'zivra@gmail.com';
  v_admin_full_name TEXT := 'Administrador Principal';
  v_admin_role TEXT := 'super_admin';
  v_auth_user_id UUID;
BEGIN
  IF to_regclass('public.admin_users') IS NULL THEN
    RAISE EXCEPTION
      'La tabla public.admin_users no existe. Ejecuta primero scripts/007_admin_hierarchy_analytics_notifications.sql.';
  END IF;

  IF v_admin_role NOT IN ('super_admin', 'gerente', 'supervisor', 'caja') THEN
    RAISE EXCEPTION 'Rol inválido: %', v_admin_role;
  END IF;

  SELECT id
  INTO v_auth_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_admin_email)
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION
      'No existe un usuario en auth.users con email=% . Créalo primero en Authentication > Users.',
      v_admin_email;
  END IF;

  UPDATE public.admin_users
  SET
    auth_user_id = v_auth_user_id,
    email = lower(v_admin_email),
    full_name = v_admin_full_name,
    role = v_admin_role,
    is_active = true,
    updated_at = now()
  WHERE auth_user_id = v_auth_user_id
     OR email = lower(v_admin_email);

  IF NOT FOUND THEN
    INSERT INTO public.admin_users (
      auth_user_id,
      email,
      full_name,
      role,
      is_active
    )
    VALUES (
      v_auth_user_id,
      lower(v_admin_email),
      v_admin_full_name,
      v_admin_role,
      true
    );
  END IF;

  RAISE NOTICE 'Admin sincronizado correctamente: % (%).', lower(v_admin_email), v_auth_user_id;
END
$$;
