CREATE OR REPLACE FUNCTION public.set_password_changed_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.raw_app_meta_data :=
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object(
        'password_changed_at',
        to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      );
    RETURN NEW;
  END IF;

  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    NEW.raw_app_meta_data :=
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object(
        'password_changed_at',
        to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_password_changed_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_password_changed ON auth.users;

CREATE TRIGGER on_auth_password_changed
  BEFORE INSERT OR UPDATE OF encrypted_password
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_password_changed_at();

UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object(
    'password_changed_at',
    to_char(
      timezone('utc', COALESCE(created_at, now())),
      'YYYY-MM-DD"T"HH24:MI:SS"Z"'
    )
  )
WHERE raw_app_meta_data->>'password_changed_at' IS NULL;
