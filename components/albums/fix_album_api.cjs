const fs = require('fs');

let apiCode = fs.readFileSync('../../hono-backend/routes/albums/albums.ts', 'utf8');

const putEndpoint = "\n\n" +
"albumsRoute.put('/:id', requireAuthJwt, async (c) => {\n" +
"  try {\n" +
"    const db = getD1(c)\n" +
"    if (!db) return c.json({ error: 'Database not configured' }, 503)\n" +
"    const user = c.get('user')\n" +
"    if (!user?.id) return c.json({ error: 'Unauthorized' }, 401)\n" +
"    if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)\n" +
"    const albumId = c.req.param('id')\n" +
"    const body = await c.req.json()\n" +
"    const { status } = body\n" +
"    if (!status) return c.json({ error: 'Missing status' }, 400)\n" +
"    const result = await db.prepare('UPDATE albums SET status = ? WHERE id = ?').bind(status, albumId).run()\n" +
"    if (!result.success) return c.json({ error: 'Failed to update album' }, 400)\n" +
"    return c.json({ success: true, status }, 200)\n" +
"  } catch(error) {\n" +
"    console.error('ERROR ALBUMS API (PUT):', error);\n" +
"    return c.json({error: 'Internal server error', details: String(error)}, 500);\n" +
"  }\n" +
"})\n";

if(!apiCode.includes('albumsRoute.put')) {
    apiCode = apiCode.replace('export default albumsRoute', putEndpoint + '\nexport default albumsRoute');
    fs.writeFileSync('../../hono-backend/routes/albums/albums.ts', apiCode);
    console.log('Added PUT endpoint');
}
