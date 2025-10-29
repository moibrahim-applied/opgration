import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Fetch the image from the URL
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Check if it's actually an image
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: `URL does not point to an image file. Content-Type: ${contentType}` },
        { status: 400 }
      );
    }

    // Convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Extract filename from URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'image';

    return NextResponse.json({
      base64,
      size: buffer.length,
      fileName,
      mimeType: contentType || 'image/jpeg'
    });
  } catch (error) {
    console.error('Image to Base64 error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert image' },
      { status: 500 }
    );
  }
}
