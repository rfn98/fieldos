import { NextRequest, NextResponse } from "next/server";
import { PipeError, type PipeErrorKind } from "@/lib/types";
import { investigate } from "@/lib/investigate";

export const runtime = "nodejs";

const ERROR_STATUS: Record<PipeErrorKind, number> = {
  invalid_request: 400,
  database: 500,
  moss_config: 503,
  moss_retrieval: 502,
  llm_config: 503,
  llm_request: 502,
  llm_malformed: 502,
  internal: 500,
};

function errorResponse(kind: PipeErrorKind, message: string): NextResponse {
  return NextResponse.json({ error: { kind, message } }, { status: ERROR_STATUS[kind] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { question?: unknown };
  try {
    body = (await request.json()) as { question?: unknown };
  } catch {
    return errorResponse("invalid_request", "Request body must be valid JSON.");
  }

  try {
    const result = await investigate({ question: body?.question });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PipeError) {
      return errorResponse(error.kind, error.message);
    }
    console.error("[api/investigate] unexpected error", error);
    return errorResponse("internal", "Internal server error.");
  }
}