-- Store Web Push subscription as JSON (PushSubscription.toJSON shape).
-- Generated column enables stable upsert per (user, endpoint).

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS subscription jsonb;

UPDATE public.push_subscriptions
SET subscription = jsonb_build_object(
  'endpoint', endpoint,
  'keys', jsonb_build_object('p256dh', p256dh, 'auth', auth)
)
WHERE subscription IS NULL;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN subscription SET NOT NULL;

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_endpoint_key;

ALTER TABLE public.push_subscriptions
  DROP COLUMN IF EXISTS endpoint,
  DROP COLUMN IF EXISTS p256dh,
  DROP COLUMN IF EXISTS auth,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE public.push_subscriptions
  ADD COLUMN subscription_endpoint text
  GENERATED ALWAYS AS ((subscription->>'endpoint')) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_id_endpoint_key
  ON public.push_subscriptions (user_id, subscription_endpoint);
