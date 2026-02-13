import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export const createValidationErrorResponse = (
  zodError: ZodError,
  errorMessage: string = 'リクエストボディが不正です',
) => {
  const details = zodError.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'root',
    message: issue.message,
  }));

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      details,
    },
    { status: 400 },
  );
};
