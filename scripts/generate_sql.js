const fs = require('fs');

async function main() {
    const provRes = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
    const provs = await provRes.json();

    let sql = '-- Seed 38 Provinces\n';
    sql += 'INSERT INTO public.ref_provinces (id, name) VALUES\n';
    const provRows = provs.map(p => `  ('${p.id}', '${p.name.replace(/'/g, "''")}')`);
    sql += provRows.join(',\n') + '\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n\n';

    let cityChunks = [];
    const CHUNK_SIZE = 100;

    for (const prov of provs) {
        const citiesUrl = 'https://www.emsifa.com/api-wilayah-indonesia/api/regencies/' + prov.id + '.json';
        try {
            const cityRes = await fetch(citiesUrl);
            const cities = await cityRes.json();
            const cityRows = cities.map(c => {
                const kind = c.name.toLowerCase().startsWith('kota ') ? 'kota' : 'kabupaten';
                return `  ('${c.id}', '${c.province_id}', '${c.name.replace(/'/g, "''")}', '${kind}')`;
            });
            cityChunks.push(...cityRows);
        } catch (e) {
            console.error('Failed to fetch cities for prov ID ' + prov.id);
        }
    }

    sql += '-- Seed 514 Cities/Regencies\n';

    const chunks = [];
    for (let i = 0; i < cityChunks.length; i += CHUNK_SIZE) {
        const chunk = cityChunks.slice(i, i + CHUNK_SIZE);
        chunks.push('INSERT INTO public.ref_cities (id, province_id, name, kind) VALUES\n' + chunk.join(',\n') + '\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind;\n');
    }

    sql += chunks.join('\n');

    fs.writeFileSync('supabase/seed_regional_data.sql', sql);
    console.log('SQL generated: supabase/seed_regional_data.sql');
}

main().catch(console.error);
