# ChanhTea Supabase SQL

Run the files in `supabase/migrations` in this order:

1. `001_extensions_enums.sql`
2. `002_schema.sql`
3. `003_functions_rls.sql`
4. `004_seed_demo_data.sql`

Important rules:

- Product and store images are hosted on Cloudinary.
- Supabase stores only URL fields such as `image_url`, `avatar_url`, `map_url`, and `route_url`.
- Guest order creation should go through a trusted backend or Supabase Edge Function using `service_role`.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in frontend JavaScript.
- Store/admin dashboards must use authenticated Supabase sessions; frontend RBAC is only display logic, RLS is the real security layer.
- `sold_today` is increased inside `update_order_status()` when an order first moves to `accepted`.
- `reset_daily_store_product_sales()` resets `sold_today` to `0`. Migration `003` attempts to schedule it with `pg_cron` at `17:00 UTC` (`00:00 Asia/Saigon`). If `pg_cron` is unavailable, run that function from an external cron job.
