import { NextRequest, NextResponse } from 'next/server';

/**
 * Gmail Send Email Custom Endpoint
 *
 * Handles the complexity of formatting emails in RFC 2822 format
 * and base64url encoding them for the Gmail API.
 *
 * Security features:
 * - Email address validation
 * - Header injection prevention
 * - Proper content encoding
 */

// Email validation regex (basic but effective)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Function to validate and sanitize email addresses
function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

// Function to sanitize header values (prevent header injection)
function sanitizeHeader(value: string): string {
  if (!value) return '';
  // Remove newlines and carriage returns to prevent header injection
  return value.replace(/[\r\n]/g, '').trim();
}

// Function to convert string to base64url encoding (Gmail specific)
function base64urlEncode(str: string): string {
  // Convert to base64
  const base64 = Buffer.from(str, 'utf-8').toString('base64');
  // Convert to base64url (replace +/= with -_)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Function to construct RFC 2822 email format
function constructEmail(params: {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string;
  bcc?: string;
  fromName?: string;
}): string {
  const { to, subject, body, isHtml = false, cc, bcc, fromName } = params;

  // Start building email headers
  const headers: string[] = [];

  // To header (required)
  headers.push(`To: ${sanitizeHeader(to)}`);

  // From header (if custom name provided)
  if (fromName) {
    headers.push(`From: ${sanitizeHeader(fromName)}`);
  }

  // CC header (optional)
  if (cc) {
    headers.push(`Cc: ${sanitizeHeader(cc)}`);
  }

  // BCC header (optional)
  if (bcc) {
    headers.push(`Bcc: ${sanitizeHeader(bcc)}`);
  }

  // Subject header (required)
  headers.push(`Subject: ${sanitizeHeader(subject)}`);

  // Content-Type header
  const contentType = isHtml
    ? 'text/html; charset=utf-8'
    : 'text/plain; charset=utf-8';
  headers.push(`Content-Type: ${contentType}`);

  // MIME version
  headers.push('MIME-Version: 1.0');

  // Combine headers and body with proper line endings
  const email = headers.join('\r\n') + '\r\n\r\n' + body;

  return email;
}

export async function POST(request: NextRequest) {
  console.log('🔵 Gmail endpoint hit!');
  try {
    // Parse request body
    let body;
    try {
      const text = await request.text();
      console.log('Gmail send email - Received request, body length:', text.length);
      body = JSON.parse(text);
      console.log('Gmail send email - Parsed body:', { to: body.to, subject: body.subject });
    } catch (e) {
      console.error('Gmail send email - JSON parse error:', e);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const {
      to,
      subject,
      body: emailBody,
      isHtml = false,
      cc,
      bcc,
      fromName
    } = body;

    // Validate required fields
    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    // Validate email addresses
    const toEmails = to.split(',').map((e: string) => e.trim());
    for (const email of toEmails) {
      if (!validateEmail(email)) {
        return NextResponse.json(
          { error: `Invalid email address: ${email}` },
          { status: 400 }
        );
      }
    }

    // Validate CC emails if provided
    if (cc) {
      const ccEmails = cc.split(',').map((e: string) => e.trim());
      for (const email of ccEmails) {
        if (!validateEmail(email)) {
          return NextResponse.json(
            { error: `Invalid CC email address: ${email}` },
            { status: 400 }
          );
        }
      }
    }

    // Validate BCC emails if provided
    if (bcc) {
      const bccEmails = bcc.split(',').map((e: string) => e.trim());
      for (const email of bccEmails) {
        if (!validateEmail(email)) {
          return NextResponse.json(
            { error: `Invalid BCC email address: ${email}` },
            { status: 400 }
          );
        }
      }
    }

    // Get the Authorization header (passed from execute endpoint)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization' },
        { status: 401 }
      );
    }

    // Construct RFC 2822 formatted email
    const rfc2822Email = constructEmail({
      to,
      subject,
      body: emailBody,
      isHtml,
      cc,
      bcc,
      fromName
    });

    console.log('Constructed email (first 200 chars):', rfc2822Email.substring(0, 200));

    // Base64url encode the email
    const encodedEmail = base64urlEncode(rfc2822Email);

    // Send to Gmail API
    const gmailUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

    console.log('🔵 Sending to Gmail API...');
    const response = await fetch(gmailUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail
      }),
    });

    console.log('🔵 Gmail API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gmail API error:', errorData);
      return NextResponse.json(
        {
          error: `Failed to send email: ${response.statusText}`,
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('🔵 Gmail API success! Message ID:', data.id);

    return NextResponse.json({
      success: true,
      messageId: data.id,
      threadId: data.threadId,
      labelIds: data.labelIds
    });

  } catch (error) {
    console.error('🔴 Gmail send email error:', error);
    console.error('🔴 Error stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send email',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
