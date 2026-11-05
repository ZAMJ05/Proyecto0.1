import "dotenv/config";
import fs from "fs";
import path from "path";
import {
  buildPendingWorkbook,
  pendingReportFilename,
} from "../src/lib/pending-report";

async function main() {
  const file = await buildPendingWorkbook();
  const dir = path.join(process.cwd(), "reportes");
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, pendingReportFilename());
  fs.writeFileSync(target, file);
  console.log(target);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
