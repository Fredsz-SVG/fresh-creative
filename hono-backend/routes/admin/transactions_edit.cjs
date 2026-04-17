const fs = require('fs');
let code = fs.readFileSync('hono-backend/routes/admin/transactions.ts', 'utf-8');

code = code.replace(
  't.invoice_url, t.created_at, t.album_id, t.description,',
  't.invoice_url, t.created_at, t.album_id, t.description, a.package_snapshot, t.new_students_count, a.students_count as total_students,'
);
// replace in txSelect too
code = code.replace(
  't.invoice_url, t.created_at, t.album_id, t.description,\\n    cp.credits as pkg_credits, a.name as album_name',
  't.invoice_url, t.created_at, t.album_id, t.description,\\n    a.package_snapshot, t.new_students_count, a.students_count as total_students,\\n    cp.credits as pkg_credits, a.name as album_name'
);

code = code.replace(
  'const { pkg_credits, album_name, ...rest } = row',
  'const { pkg_credits, album_name, package_snapshot, new_students_count, total_students, ...rest } = row'
);

code = code.replace(
  'return { ...rest, credits: pkg_credits ?? null, album_name: album_name ?? null }',
  'return { ...rest, credits: pkg_credits ?? null, album_name: album_name ?? null, package_snapshot: package_snapshot ?? null, new_students_count: new_students_count ?? null, total_students: total_students ?? null }'
);

code = code.replace(
  'const { pkg_credits, album_name, ...rest } = tx',
  'const { pkg_credits, album_name, package_snapshot, new_students_count, total_students, ...rest } = tx'
);

code = code.replace(
  'return { ...rest, ...u, credits: pkg_credits ?? null, album_name: album_name ?? null }',
  'return { ...rest, ...u, credits: pkg_credits ?? null, album_name: album_name ?? null, package_snapshot: package_snapshot ?? null, new_students_count: new_students_count ?? null, total_students: total_students ?? null }'
);

fs.writeFileSync('hono-backend/routes/admin/transactions.ts', code);
