-- Paušo: RLS + kolone za korisnički profil (company_data, onboarding, poresni kalendar)
-- Pokreni u Supabase → SQL Editor (jednom). Napravi backup pre produkcije.

-- ─── 1) Kolone na profiles ───────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS poresni_kalendar_placanja jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ─── 2) user_id na transakcionim tabelama (ako već postoji, IF NOT EXISTS je bezbedan) ───
ALTER TABLE public.prihodi
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.fakture
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.rashodi
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

-- Ako imaš redove bez user_id, dodeli ih ručno ili obriši pre NOT NULL:
-- DELETE FROM public.prihodi WHERE user_id IS NULL;
-- Zatim (opciono):
-- ALTER TABLE public.prihodi ALTER COLUMN user_id SET NOT NULL;

-- ─── 3) RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prihodi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fakture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rashodi ENABLE ROW LEVEL SECURITY;

-- Zameni stare politike istog imena
DROP POLICY IF EXISTS "Users can only see own data" ON public.profiles;
DROP POLICY IF EXISTS "Users can only see own data" ON public.prihodi;
DROP POLICY IF EXISTS "Users can only see own data" ON public.fakture;
DROP POLICY IF EXISTS "Users can only see own data" ON public.rashodi;

CREATE POLICY "Users can only see own data"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can only see own data"
  ON public.prihodi
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only see own data"
  ON public.fakture
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only see own data"
  ON public.rashodi
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
