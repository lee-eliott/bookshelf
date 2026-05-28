-- Migration: add user_id + RLS to existing tables
-- Run this in the Supabase SQL Editor

-- 1. Add user_id to books (if not already there)
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add user_id to wishlist
ALTER TABLE wishlist
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Add missing indexes
CREATE INDEX IF NOT EXISTS books_user_id_idx     ON books(user_id);
CREATE INDEX IF NOT EXISTS wishlist_user_id_idx  ON wishlist(user_id);

-- 4. Enable Row Level Security
ALTER TABLE books    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- 5. Policies books
CREATE POLICY "books_select" ON books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "books_insert" ON books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "books_update" ON books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "books_delete" ON books FOR DELETE USING (auth.uid() = user_id);

-- 6. Policies wishlist
CREATE POLICY "wishlist_select" ON wishlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wishlist_insert" ON wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wishlist_update" ON wishlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wishlist_delete" ON wishlist FOR DELETE USING (auth.uid() = user_id);
