-- Function: get_dashboard_stats()
-- Returns scalar ticket metrics for the dashboard.
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_tickets       BIGINT,
  open_tickets        BIGINT,
  resolved_by_ai      BIGINT,
  percent_resolved_by_ai FLOAT,
  avg_resolution_time_ms FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_tickets,

    COUNT(*) FILTER (
      WHERE status IN ('new', 'processing', 'open')
    )::BIGINT AS open_tickets,

    COUNT(*) FILTER (
      WHERE status = 'resolved'
        AND EXISTS (
          SELECT 1 FROM reply r
          WHERE r."ticketId" = t.id
            AND r."senderType" = 'ai'
        )
    )::BIGINT AS resolved_by_ai,

    CASE
      WHEN COUNT(*) = 0 THEN 0.0
      ELSE (
        COUNT(*) FILTER (
          WHERE status = 'resolved'
            AND EXISTS (
              SELECT 1 FROM reply r
              WHERE r."ticketId" = t.id
                AND r."senderType" = 'ai'
            )
        )::FLOAT / COUNT(*)::FLOAT * 100.0
      )
    END AS percent_resolved_by_ai,

    COALESCE(
      AVG(
        EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) * 1000.0
      ) FILTER (WHERE status IN ('resolved', 'closed')),
      0.0
    ) AS avg_resolution_time_ms

  FROM ticket t;
$$;

-- Function: get_tickets_per_day(days INT)
-- Returns one row per calendar day for the past N days, zero-filled.
CREATE OR REPLACE FUNCTION get_tickets_per_day(days INT DEFAULT 30)
RETURNS TABLE (
  day   TEXT,
  count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    TO_CHAR(d::DATE, 'YYYY-MM-DD') AS day,
    COALESCE(counts.cnt, 0)::BIGINT AS count
  FROM
    generate_series(
      (CURRENT_DATE - (days - 1) * INTERVAL '1 day'),
      CURRENT_DATE,
      INTERVAL '1 day'
    ) AS d
  LEFT JOIN (
    SELECT
      DATE("createdAt") AS ticket_date,
      COUNT(*)::BIGINT AS cnt
    FROM ticket
    WHERE "createdAt" >= CURRENT_DATE - (days - 1) * INTERVAL '1 day'
    GROUP BY DATE("createdAt")
  ) AS counts ON counts.ticket_date = d::DATE
  ORDER BY d;
$$;
