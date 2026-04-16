const content = require("fs").readFileSync("app/admin/showcase/page.tsx", "utf8"); console.log(content.substring(content.indexOf("grid grid-cols-1"), content.indexOf("grid grid-cols-1") + 200));
