const fs=require("fs");
let code=fs.readFileSync("hono-backend/routes/albums/albums.ts","utf8");
code=code.replace(/} catch \(error: unknown\) \{\n    return c\.json\(\{ error: .Internal server error. \}, 500\)\n  \}/g, `} catch(error) {\n    console.error("ERROR ALBUMS API:", error);\n    return c.json({error: "Internal server error", details: String(error)}, 500);\n  }`);
fs.writeFileSync("hono-backend/routes/albums/albums.ts", code);

