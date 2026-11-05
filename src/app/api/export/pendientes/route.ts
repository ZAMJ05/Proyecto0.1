import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import {
  buildPendingWorkbook,
  pendingReportFilename,
} from "@/lib/pending-report";

export async function GET() {
  try {
    await requireSession();
    const file = await buildPendingWorkbook();
    return new Response(file, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${pendingReportFilename()}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
