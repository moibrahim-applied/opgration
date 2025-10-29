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

    let { spreadsheetId, sheetName, filters, filterLogic = 'AND', returnAll = true } = body;

    console.log('Parsed params (raw):', { spreadsheetId, sheetName, filters, filterLogic, returnAll });

    // Parse filters if it's a JSON string
    if (typeof filters === 'string') {
      try {
        filters = JSON.parse(filters);
        console.log('Parsed filters from string:', filters);
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid filters format. Must be a valid JSON array.' },
          { status: 400 }
        );
      }
    }

    // Parse returnAll if it's a string
    if (typeof returnAll === 'string') {
      returnAll = returnAll === 'true' || returnAll === '1';
    }

    console.log('Parsed params (final):', { spreadsheetId, sheetName, filters, filterLogic, returnAll });

    // Validate inputs
    if (!spreadsheetId || !sheetName || !filters || !Array.isArray(filters)) {
      return NextResponse.json(
        {
          error: 'Missing required fields: spreadsheetId, sheetName, filters',
          received: {
            spreadsheetId: !!spreadsheetId,
            sheetName: !!sheetName,
            filters: !!filters,
            filtersIsArray: Array.isArray(filters),
            filtersType: typeof filters
          }
        },
        { status: 400 }
      );
    }

    // Get the Authorization header (passed from execute endpoint)
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    // Fetch all data from the sheet
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?valueRenderOption=FORMATTED_VALUE`;

    const response = await fetch(sheetsUrl, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Failed to fetch sheet data: ${response.statusText}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const values = data.values || [];

    if (values.length === 0) {
      return NextResponse.json({
        matchedRows: [],
        totalMatches: 0,
        message: 'Sheet is empty'
      });
    }

    // First row is headers
    const headers = values[0];
    const rows = values.slice(1);

    // Build column index map
    const columnIndexMap: { [key: string]: number } = {};
    headers.forEach((header: string, index: number) => {
      columnIndexMap[header] = index;
    });

    // Validate that all filter columns exist
    for (const filter of filters) {
      if (columnIndexMap[filter.columnName] === undefined) {
        return NextResponse.json(
          { error: `Column '${filter.columnName}' not found in sheet. Available columns: ${headers.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Apply filters
    const matchedRows: any[] = [];

    for (const row of rows) {
      let matches = false;

      if (filterLogic.toUpperCase() === 'AND') {
        // All filters must match
        matches = filters.every((filter: any) => {
          const columnIndex = columnIndexMap[filter.columnName];
          const cellValue = row[columnIndex] || '';
          return cellValue.toString().toLowerCase().includes(filter.searchValue.toString().toLowerCase());
        });
      } else {
        // At least one filter must match (OR)
        matches = filters.some((filter: any) => {
          const columnIndex = columnIndexMap[filter.columnName];
          const cellValue = row[columnIndex] || '';
          return cellValue.toString().toLowerCase().includes(filter.searchValue.toString().toLowerCase());
        });
      }

      if (matches) {
        // Convert row array to object with column names
        const rowObject: any = {};
        headers.forEach((header: string, index: number) => {
          rowObject[header] = row[index] || '';
        });
        matchedRows.push(rowObject);

        // If returnAll is false, stop after first match
        if (!returnAll) {
          break;
        }
      }
    }

    return NextResponse.json({
      matchedRows,
      totalMatches: matchedRows.length,
      filters: filters,
      filterLogic: filterLogic.toUpperCase()
    });

  } catch (error) {
    console.error('Sheet search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search sheet' },
      { status: 500 }
    );
  }
}
