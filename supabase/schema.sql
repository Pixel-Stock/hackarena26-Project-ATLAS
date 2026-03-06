-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Users Table (extending Supabase Next.js simple schema)
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  avatar_url text,
  preferences jsonb default '{"currency": "INR", "theme": "dark"}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Categories Table
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  icon text not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Budgets Table
create table public.budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  month text not null, -- format: "YYYY-MM"
  budget_limit numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, month)
);

-- 4. Create Transactions Table
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  merchant text not null,
  category text not null,
  amount numeric not null,
  date date not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create Receipts Table
create table public.receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  image_url text not null,
  ocr_text text,
  merchant text,
  amount numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.transactions enable row level security;
alter table public.receipts enable row level security;

-- Policies for Users (allow user to read/write their own data, or public insert for simple testing without real auth constraint if no auth yet)
-- NOTE: For a real app using Supabase Auth, you'd use `auth.uid()`. 
-- Since we might not have Supabase Auth wired up fully in the UI yet (we were using a dummy user),
-- we will allow ALL access for now. Once auth is integrated, these should be restricted to auth.uid().
create policy "Allow all operations for users" on public.users for all using (true) with check (true);
create policy "Allow all operations for categories" on public.categories for all using (true) with check (true);
create policy "Allow all operations for budgets" on public.budgets for all using (true) with check (true);
create policy "Allow all operations for transactions" on public.transactions for all using (true) with check (true);
create policy "Allow all operations for receipts" on public.receipts for all using (true) with check (true);

-- Create Storage Bucket for Receipts
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true) on conflict do nothing;

create policy "Allow public read access on receipts bucket" on storage.objects for select using ( bucket_id = 'receipts' );
create policy "Allow public insert to receipts bucket" on storage.objects for insert with check ( bucket_id = 'receipts' );

-- Optional: Insert a default user for testing if no real auth exists yet.
insert into public.users (id, name, email, avatar_url, preferences)
values (
  '11111111-1111-1111-1111-111111111111', 
  'Demo User', 
  'demo@snapbudget.com', 
  'https://ui-avatars.com/api/?name=Demo+User&background=random', 
  '{"currency": "INR", "theme": "dark"}'::jsonb
) on conflict do nothing;
