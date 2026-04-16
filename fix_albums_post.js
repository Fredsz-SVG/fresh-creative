const fs = require('fs');
const filePath = 'C:/Users/Admin/Downloads/Fresh-web/frontend/hono-backend/routes/albums/albums.ts';
let code = fs.readFileSync(filePath, 'utf8');

const prePost = 
      // Fetch pricing package to create snapshot
      let packageSnapshotJson = null;
      if (pricing_package_id) {
        const pkgData = await db.prepare(
          'SELECT name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features FROM pricing_packages WHERE id = ?'
        ).bind(pricing_package_id).first();
        
        if (pkgData) {
          packageSnapshotJson = JSON.stringify({
            name: pkgData.name,
            price_per_student: pkgData.price_per_student,
            min_students: pkgData.min_students,
            features: pkgData.features,
            flipbook_enabled: Boolean(pkgData.flipbook_enabled),
            ai_labs_features: pkgData.ai_labs_features
          });
        }
      }
;

code = code.replace(
  /const individual_payments_enabled = 1;\s*const result = await db\.prepare\(\s*\INSERT INTO albums \([\s\S]*?RETURNING id\\s*\)\.bind\([\s\S]*?\)\.first\(\)/,
  const individual_payments_enabled = 1;
 + prePost + 
      const result = await db.prepare(
        \INSERT INTO albums (
          id, user_id, name, type, description, pricing_package_id, package_snapshot,
          school_city, kab_kota, wa_e164, province_id,
          province_name, pic_name, students_count, source,
          total_estimated_price, individual_payments_enabled
        ) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id\
      ).bind(
        user.id, name, type, description || null, pricing_package_id || null, packageSnapshotJson,
        school_city || null, kab_kota || null, wa_e164 || null, province_id || null,
        province_name || null, pic_name || null, students_count || 0, source || null,
        total_estimated_price || 0, individual_payments_enabled
      ).first()
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Fixed albums.ts POST route');
