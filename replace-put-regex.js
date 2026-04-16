const fs = require('fs');
const file = 'c:/Users/Admin/Downloads/Fresh-web/frontend/hono-backend/routes/albums/albums.ts';
let c = fs.readFileSync(file, 'utf8');

const regex = /const result = await db\s+\.prepare\('UPDATE albums SET status = \? WHERE id = \?'\)\s+\.bind\(status, albumId\)\s+\.run\(\)\s+if \(!result\.success\) return c\.json\(\{ error: 'Failed to update album' \}, 400\)\s+return c\.json\(\{ success: true, status \}, 200\)/;

const newStr = `// Ambil user_id dan nama untuk notif
      const albumInfo = await db.prepare('SELECT user_id, name FROM albums WHERE id = ?').bind(albumId).first()

      const result = await db
        .prepare('UPDATE albums SET status = ? WHERE id = ?')
        .bind(status, albumId)
        .run()
      if (!result.success) return c.json({ error: 'Failed to update album' }, 400)

      if (albumInfo && albumInfo.user_id) {
        const notifId = crypto.randomUUID()
        let notifTitle = ''
        let notifMessage = ''
        let notifType = 'info'
        
        if (status === 'approved' || status === 'accepted') {
          notifTitle = 'Persetujuan Disetujui'
          notifMessage = \`Selamat! Pengajuan album "\${albumInfo.name}" Anda telah disetujui.\`
          notifType = 'success'
        } else if (status === 'declined' || status === 'rejected') {
          notifTitle = 'Persetujuan Ditolak'
          notifMessage = \`Mohon maaf, pengajuan album "\${albumInfo.name}" Anda ditolak oleh admin.\`
          notifType = 'error'
        }

        if (notifTitle) {
          await db.prepare('INSERT INTO notifications (id, user_id, title, message, type, action_url) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(notifId, albumInfo.user_id, notifTitle, notifMessage, notifType, '/user/riwayat')
            .run()
          invalidateUserResponseCaches(albumInfo.user_id as string)
        }
      }

      return c.json({ success: true, status }, 200)`;

if (regex.test(c)) {
  c = c.replace(regex, newStr);
  fs.writeFileSync(file, c);
  console.log("Replaced successfully!");
} else {
  console.log("Not found.");
}