const fs = require('fs');

let code = fs.readFileSync('AlbumsView.tsx', 'utf8');
let original = code;

// 1. Fix DELETE API URL 
code = code.replace(/fetchWithAuth\(\/api\/albums\/, { method: 'DELETE',       credentials: 'include' }\)/g, 
"fetchWithAuth(\/api/albums/\\, { method: 'DELETE', credentials: 'include' })");

// 2. Fix PUT API URL for Approve
code = code.replace(/fetchWithAuth\(\/api\/albums\/, { method: 'PUT',\r?\ncredentials: 'include', headers: { 'Content-Type': 'application\/json' }, body:  JSON.stringify\({ status: 'approved' }\) }\)/g, 
"fetchWithAuth(\/api/albums/\\, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) })");

// 3. Fix PUT API URL for Decline 
code = code.replace(/fetchWithAuth\(\/api\/albums\/, { method: 'PUT',\r?\ncredentials: 'include', headers: { 'Content-Type': 'application\/json' }, body:  JSON.stringify\({ status: 'declined' }\) }\)/g, 
"fetchWithAuth(\/api/albums/\\, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'declined' }) })");

if (code !== original) {
    fs.writeFileSync('AlbumsView.tsx', code);
    console.log('Fixed Albums API calls (dirty)');
} else {
    // If not matched, try generic replace
    code = code.replace(/fetchWithAuth\([^\)]*method: 'PUT'[^\)]*status: 'approved'[^\)]*\)/, "fetchWithAuth(\/api/albums/\\, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) })");
    code = code.replace(/fetchWithAuth\([^\)]*method: 'PUT'[^\)]*status: 'declined'[^\)]*\)/, "fetchWithAuth(\/api/albums/\\, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'declined' }) })");
    code = code.replace(/fetchWithAuth\([^\)]*method: 'DELETE'[^\)]*\)/, "fetchWithAuth(\/api/albums/\\, { method: 'DELETE', credentials: 'include' })");
    fs.writeFileSync('AlbumsView.tsx', code);
    console.log('Fixed Albums API calls (generic)');
}

