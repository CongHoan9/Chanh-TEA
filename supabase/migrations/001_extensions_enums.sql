-- ================================================================
-- ChanhTea Supabase Migration 001
-- Extensions and enums
-- Run first in Supabase SQL Editor.
-- ================================================================

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- Optional on Supabase paid projects. If this fails, run reset_daily_store_product_sales()
-- from an external cron service instead.
do $$
begin
  create extension if not exists pg_cron;
exception
  when insufficient_privilege then
    raise notice 'pg_cron is not available for this database role. Use an external cron job for daily resets.';
  when feature_not_supported then
    raise notice 'pg_cron is not available on this Supabase plan. Use an external cron job for daily resets.';
end $$;

do $$
begin
  create type public.app_role as enum (
    'store_staff',
    'store_manager',
    'store_owner',
    'courier',
    'regional_manager',
    'support',
    'system_admin'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum (
    'pending',
    'assigned',
    'accepted',
    'rejected',
    'preparing',
    'ready',
    'delivering',
    'failed_delivery',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.fulfillment_method as enum (
    'delivery',
    'pickup'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum (
    'unpaid',
    'pending',
    'paid',
    'refunded',
    'failed'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.store_product_status as enum (
    'available',
    'unavailable',
    'hidden'
  );
exception when duplicate_object then null;
end $$;
