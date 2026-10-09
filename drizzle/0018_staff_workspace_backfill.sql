-- Backfill untuk 0018_staff_workspace (dijalankan sekali, setelah perubahan schema, dalam transaksi yang sama).

-- 1. Nomor issue per project untuk tiket yang sudah ada, urut tanggal dibuat.
WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at, id) AS rn
  FROM tickets
  WHERE project_id IS NOT NULL
)
UPDATE tickets t SET number = numbered.rn FROM numbered WHERE t.id = numbered.id;
--> statement-breakpoint
UPDATE projects p
SET issue_counter = COALESCE((SELECT max(t.number) FROM tickets t WHERE t.project_id = p.id), 0);
--> statement-breakpoint

-- 2. Member: staff otomatis jadi member project di timnya; pembuat project jadi owner.
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, u.id, CASE WHEN u.id = p.created_by THEN 'owner' ELSE 'member' END
FROM projects p
JOIN users u ON u.team = p.team AND u.role = 'staff'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- PM yang punya akses lintas tim ikut jadi member project tim tersebut.
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, u.id, 'member'
FROM projects p
JOIN users u ON u.role = 'staff' AND p.team = ANY(u.access)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Pembuat project (staff) jadi owner walaupun beda tim.
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, u.id, 'owner'
FROM projects p
JOIN users u ON u.id = p.created_by AND u.role = 'staff'
ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'owner';
--> statement-breakpoint
-- Project tanpa owner (mis. pembuatnya sudah dihapus): member pertama jadi owner.
UPDATE project_members pm
SET role = 'owner'
FROM (
  SELECT DISTINCT ON (project_id) project_id, user_id
  FROM project_members
  WHERE project_id NOT IN (SELECT project_id FROM project_members WHERE role = 'owner')
  ORDER BY project_id, created_at, user_id
) first_member
WHERE pm.project_id = first_member.project_id AND pm.user_id = first_member.user_id;
--> statement-breakpoint

-- 3. Label awal per project dari daftar label lama (umum + khusus tim).
INSERT INTO project_labels (project_id, name, color)
SELECT p.id, l.name, l.color
FROM projects p
JOIN (VALUES
  (NULL, 'bug', 'Bug', '#DC2626'),
  (NULL, 'feature', 'Feature', '#2563EB'),
  (NULL, 'improvement', 'Improvement', '#7C3AED'),
  (NULL, 'documentation', 'Documentation', '#0891B2'),
  (NULL, 'question', 'Question', '#D97706'),
  ('cloud', 'infra', 'Infrastructure', '#0F766E'),
  ('cloud', 'network', 'Network', '#0284C7'),
  ('cloud', 'security', 'Security', '#BE123C'),
  ('devops', 'pipeline', 'Pipeline', '#4F46E5'),
  ('devops', 'deployment', 'Deployment', '#059669'),
  ('devops', 'monitoring', 'Monitoring', '#CA8A04'),
  ('pm', 'requirement', 'Requirement', '#DB2777'),
  ('pm', 'scope', 'Scope', '#9333EA'),
  ('pm', 'priority', 'Priority', '#EA580C')
) AS l(team, value, name, color) ON l.team IS NULL OR l.team = p.team
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- tickets.labels sekarang menyimpan id label project: ubah nilai lama (mis. "bug") ke id.
UPDATE tickets t
SET labels = COALESCE((
  SELECT array_agg(pl.id::text)
  FROM unnest(t.labels) AS old(value)
  JOIN (VALUES
    ('bug', 'Bug'), ('feature', 'Feature'), ('improvement', 'Improvement'),
    ('documentation', 'Documentation'), ('question', 'Question'),
    ('infra', 'Infrastructure'), ('network', 'Network'), ('security', 'Security'),
    ('pipeline', 'Pipeline'), ('deployment', 'Deployment'), ('monitoring', 'Monitoring'),
    ('requirement', 'Requirement'), ('scope', 'Scope'), ('priority', 'Priority')
  ) AS m(value, name) ON m.value = old.value
  JOIN project_labels pl ON pl.project_id = t.project_id AND pl.name = m.name
), '{}')
WHERE t.labels IS NOT NULL AND array_length(t.labels, 1) > 0;
