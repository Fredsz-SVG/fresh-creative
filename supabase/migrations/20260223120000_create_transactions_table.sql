-- Create transactions table to store Xendit invoices (Xendit)
-- Pastikan fungsi updated_at ada (bisa sudah dari schema awal)
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text NOT NULL UNIQUE,
  package_id uuid REFERENCES public.credit_packages(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED')),
  invoice_url text,
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON public.transactions(external_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_transactions_timestamp ON public.transactions;
CREATE TRIGGER set_transactions_timestamp BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own transactions
DROP POLICY IF EXISTS "Users can read own transactions" ON public.transactions;
CREATE POLICY "Users can read own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- Admins can read everything
DROP POLICY IF EXISTS "Admins can read all transactions" ON public.transactions;
CREATE POLICY "Admins can read all transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
