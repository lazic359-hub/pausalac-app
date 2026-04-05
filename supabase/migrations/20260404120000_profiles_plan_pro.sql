-- Plan (besplatno / pro) i datum isteka Pro pretplate.
-- Pro aktivacija za sada ručno (admin postavlja plan + pro_until u Supabase).
-- TODO: integrisati procesor plaćanja (Stripe ili PaySpot za Srbiju).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS pro_until timestamptz;

COMMENT ON COLUMN public.profiles.plan IS 'free | pro';
COMMENT ON COLUMN public.profiles.pro_until IS 'Pro važi do ovog trenutka; NULL = bez isteka (ručno podešeno)';
