import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      const text = await request.text();
      console.log('Received body:', text);
      body = JSON.parse(text);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    let { spreadsheetId, range, values } = body;

    console.log('Parsed params (raw):', { spreadsheetId, range, values, valuesType: typeof values });

    // Validate required fields
    if (!spreadsheetId || !range || !values) {
      return NextResponse.json(
        { error: 'Missing required fields: spreadsheetId, range, values' },
        { status: 400 }
      );
    }

    // Parse values if it's a JSON string
    if (typeof values === 'string') {
      try {
        values = JSON.parse(values);
        console.log('Parsed values from string:', values);
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid values format. Must be a valid JSON array.' },
          { status: 400 }
        );
      }
    }

    // Ensure values is wrapped in an outer array (Google Sheets expects [[...]])
    // If user sends ["col1", "col2"], we need [["col1", "col2"]]
    if (Array.isArray(values) && values.length > 0) {
      // Check if it's already a 2D array
      if (!Array.isArray(values[0])) {
        // It's a 1D array, wrap it
        values = [values];
        console.log('Wrapped values in outer array:', values);
      }
    }

    console.log('Final values to append:', JSON.stringify(values));

    // Get the Authorization header (passed from execute endpoint)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    // Append to Google Sheets
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(sheetsUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google Sheets API error:', errorData);
      return NextResponse.json(
        { error: `Failed to append to sheet: ${response.statusText}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      spreadsheetId,
      updates: data.updates || data
    });

  } catch (error) {
    console.error('Sheet append error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to append to sheet' },
      { status: 500 }
    );
  }
}
