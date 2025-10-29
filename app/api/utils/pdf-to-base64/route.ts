import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse body from either direct call or execute wrapper
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Fetch the PDF from the URL
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Check if it's actually a PDF
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('pdf')) {
      return NextResponse.json(
        { error: `URL does not point to a PDF file. Content-Type: ${contentType}` },
        { status: 400 }
      );
    }

    // Convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Extract filename from URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'document.pdf';

    return NextResponse.json({
      base64,
      size: buffer.length,
      fileName,
      mimeType: 'application/pdf'
    });
  } catch (error) {
    console.error('PDF to Base64 error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert PDF' },
      { status: 500 }
    );
  }
}
