-- KO-7 review follow-up.
--
-- processing_started_at: set exactly once, atomically, by the request that
-- starts the importer. A conditional UPDATE ... WHERE processing_started_at
-- IS NULL lets only one caller win, so an upload is never imported twice.
--
-- byte_size: the size the browser declared when the upload was prepared.
-- The server compares it with what Storage actually holds before importing.

alter table public.uploads
  add column processing_started_at timestamptz,
  add column byte_size integer check (byte_size is null or byte_size > 0);

-- Stored originals are immutable: without an UPDATE policy a user cannot
-- overwrite (upsert) a file after the server has checked it.
drop policy "Users can update their own upload files" on storage.objects;
