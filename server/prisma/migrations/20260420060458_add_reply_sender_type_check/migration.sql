ALTER TABLE "reply" ADD CONSTRAINT "reply_author_id_matches_sender_type"
  CHECK (
    ("senderType" = 'agent'    AND "authorId" IS NOT NULL) OR
    ("senderType" = 'customer' AND "authorId" IS NULL)
  );