const fs = require('fs');
let code = fs.readFileSync('AlbumsView.tsx', 'utf8');

const match = code.match(/function AlbumCard.+?return \(/s);
if (match) {
    const startIndex = code.indexOf(match[0]);
    const endIndex = code.indexOf('function AlbumsView', startIndex);
    console.log(code.substring(startIndex, endIndex));
}
