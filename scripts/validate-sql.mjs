// One-off syntax check for migrations using the real Postgres parser
// (libpg-query), since no local/Docker Postgres is available to `supabase
// db reset` against yet. This catches syntax errors, not semantic ones
// (unknown tables/functions aren't caught here).
import { readFile, readdir } from "node:fs/promises";
import pkg from "libpg-query";
const { parse } = pkg;

const dir = "supabase/migrations";
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

let hadError = false;
for (const file of files) {
  const sql = await readFile(`${dir}/${file}`, "utf8");
  try {
    await parse(sql);
    console.log(`OK   ${file}`);
  } catch (err) {
    hadError = true;
    console.error(`FAIL ${file}`);
    console.error(err.message);
  }
}
process.exit(hadError ? 1 : 0);
