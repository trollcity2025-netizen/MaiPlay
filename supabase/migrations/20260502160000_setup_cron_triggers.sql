-- Setup CRON triggers for automated tasks
-- Enable pg_cron extension (should already be available in Supabase)
create extension if not exists pg_cron;

-- Schedule subscription renewal processing to run hourly
select cron.schedule(
  'process-subscription-renewals',
  '0 * * * *', -- Every hour at minute 0
  $$
  select
    net.http_post(
      url:=concat(current_setting('app.settings.supabase_url'), '/functions/v1/process_subscription_renewals'),
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', current_setting('app.settings.cron_secret'))
      ),
      body:=jsonb_build_object('scheduled', true)::text
    ) as request_id;
  $$
);

-- Optional: Add a job to clean up old data (runs daily at 2 AM)
select cron.schedule(
  'cleanup-old-data',
  '0 2 * * *', -- Daily at 2 AM
  'select cleanup_old_data();'
);

-- Function to clean up old data (placeholder - implement as needed)
create or replace function cleanup_old_data()
returns void
language plpgsql
security definer
as $$
begin
  -- Clean up old chat messages (older than 30 days)
  delete from live_chat_messages
  where created_at < now() - interval '30 days';

  -- Clean up old ticker items (older than 7 days)
  delete from live_global_ticker_items
  where starts_at < now() - interval '7 days';

  -- Clean up old admin action history (older than 90 days)
  delete from admin_action_history
  where created_at < now() - interval '90 days';

  -- Log cleanup
  insert into admin_action_history (action_type, target_type, metadata)
  values ('system_cleanup', 'maintenance', jsonb_build_object('cleanup_timestamp', now()));
end;
$$;
