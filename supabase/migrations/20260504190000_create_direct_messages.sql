-- Create direct messaging table for creator and fan chats
create table if not exists direct_messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references profiles(id),
  recipient_id uuid not null references profiles(id),
  message text not null,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_direct_messages_sender on direct_messages(sender_id);
create index if not exists idx_direct_messages_recipient on direct_messages(recipient_id);
create index if not exists idx_direct_messages_created on direct_messages(created_at desc);

alter table direct_messages enable row level security;

create policy "direct messages are visible to sender or recipient" on direct_messages
  for select using (
    sender_id = current_user_profile_id() or recipient_id = current_user_profile_id()
  );

create policy "direct messages can be sent by the authenticated sender" on direct_messages
  for insert with check (
    sender_id = current_user_profile_id()
    and sender_id <> recipient_id
  );

create policy "direct messages can be updated by the sender" on direct_messages
  for update using (
    sender_id = current_user_profile_id()
  ) with check (
    sender_id = current_user_profile_id()
  );

create policy "direct messages can be deleted by the sender" on direct_messages
  for delete using (
    sender_id = current_user_profile_id()
  );
