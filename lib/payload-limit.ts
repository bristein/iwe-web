import { NextRequest, NextResponse } from 'next/server';

// Maximum payload size in bytes (5MB)
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Check if the request payload exceeds the maximum allowed size
 * @param request - The incoming Next.js request
 * @returns NextResponse with 413 error if payload is too large, null otherwise
 */
export async function checkPayloadSize(request: NextRequest): Promise<NextResponse | null> {
  const contentLength = request.headers.get('content-length');

  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        {
          error: 'Payload too large',
          maxSize: `${MAX_PAYLOAD_SIZE / (1024 * 1024)}MB`,
          receivedSize: `${(size / (1024 * 1024)).toFixed(2)}MB`,
        },
        { status: 413 } // 413 Payload Too Large
      );
    }
  }

  return null;
}

/**
 * Safe JSON parsing with size limit enforcement
 * @param request - The incoming Next.js request
 * @returns Parsed JSON body or throws an error
 */
export async function parseJsonWithSizeLimit(request: NextRequest): Promise<unknown> {
  // First check the content-length header
  const sizeError = await checkPayloadSize(request);
  if (sizeError) {
    throw new PayloadTooLargeError(sizeError);
  }

  try {
    // Get the body text
    const text = await request.text();

    // Double-check the actual size (in case content-length was missing or wrong)
    const actualSize = new Blob([text]).size;
    if (actualSize > MAX_PAYLOAD_SIZE) {
      throw new PayloadTooLargeError(
        NextResponse.json(
          {
            error: 'Payload too large',
            maxSize: `${MAX_PAYLOAD_SIZE / (1024 * 1024)}MB`,
            receivedSize: `${(actualSize / (1024 * 1024)).toFixed(2)}MB`,
          },
          { status: 413 }
        )
      );
    }

    // Parse the JSON
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      throw error;
    }
    // Re-throw JSON parsing errors
    throw error;
  }
}

// Custom error class for payload size errors
export class PayloadTooLargeError extends Error {
  response: NextResponse;

  constructor(response: NextResponse) {
    super('Payload too large');
    this.name = 'PayloadTooLargeError';
    this.response = response;
  }
}
