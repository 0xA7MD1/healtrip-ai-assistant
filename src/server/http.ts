import "server-only";
import type { z } from "zod";

/**
 * One error envelope for every API route:
 *   { "error": { "code": "...", "message": "...", "requestId": "...", "issues"?: [...] } }
 * The requestId is also sent as the `x-request-id` header and written to the logs, so a
 * patient-facing error can be traced without logging the patient's message.
 */

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function jsonResponse(body: unknown, requestId: string, init?: ResponseInit): Response {
  return Response.json(body, {
    ...init,
    headers: { ...init?.headers, "x-request-id": requestId },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
  issues?: z.core.$ZodIssue[],
): Response {
  return jsonResponse(
    {
      error: {
        code,
        message,
        requestId,
        ...(issues && { issues: issues.map((i) => ({ path: i.path.join("."), message: i.message })) }),
      },
    },
    requestId,
    { status },
  );
}

/** Structured, PHI-free log line. Never pass message text or tool inputs containing symptoms. */
export function logEvent(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, at: new Date().toISOString(), ...fields }));
}
