const fsStr = require('fs');
const contentStr = fsStr.readFileSync('components/albums/AlbumsView.tsx', 'utf8');

const matches = contentStr.match(/<div [^>]*className=["'][^"']*border[^"']*["'][^>]*>/g);
if (matches) {
   matches.slice(0, 10).forEach(m => console.log(m));
} else {
    console.log("no matches");
}
