-- Profil korisnika + automatsko kreiranje pri registraciji (auth.users)
-- Pokreni u Supabase SQL Editor ili: supabase db push

-- ─── 1) Tabela profiles ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users (id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  registration_date date,
  porez_na_prihod numeric,
  pio_doprinos numeric,
  zdravstveno numeric,
  nezaposleni numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  company_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  poresni_kalendar_placanja jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ─── 2) Migracija sa starog šema (user_id, engleski nazivi kolona) ────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN user_id TO id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'tax_amount'
  ) THEN
    UPDATE public.profiles SET porez_na_prihod = COALESCE(porez_na_prihod, tax_amount);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pio_amount'
  ) THEN
    UPDATE public.profiles SET pio_doprinos = COALESCE(pio_doprinos, pio_amount);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'health_amount'
  ) THEN
    UPDATE public.profiles SET zdravstveno = COALESCE(zdravstveno, health_amount);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'unemployment_amount'
  ) THEN
    UPDATE public.profiles SET nezaposleni = COALESCE(nezaposleni, unemployment_amount);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_complete'
  ) THEN
    UPDATE public.profiles
    SET onboarding_completed = onboarding_completed OR COALESCE(onboarding_complete, false);
  END IF;
END $$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS tax_amount;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS pio_amount;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS health_amount;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS unemployment_amount;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_complete;

-- ─── 3) Trigger: novi korisnik → red u profiles ────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
