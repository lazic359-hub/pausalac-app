-- Polja za zaglavlje službenog KPO obrasca (sinhronizuju se iz company_data pri čuvanju)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pib text,
  ADD COLUMN IF NOT EXISTS firma_naziv text,
  ADD COLUMN IF NOT EXISTS sediste text,
  ADD COLUMN IF NOT EXISTS sifra_delatnosti text,
  ADD COLUMN IF NOT EXISTS obveznik text,
  ADD COLUMN IF NOT EXISTS sifra_poreskog_obveznika text;
