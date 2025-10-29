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

    let { spreadsheetId, sheetName, filters, updateValues, updateAllMatches = false } = body;

    console.log('Parsed params (raw):', { spreadsheetId, sheetName, filters, updateValues, updateAllMatches });

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

    // Parse updateValues if it's a JSON string
    if (typeof updateValues === 'string') {
      try {
        updateValues = JSON.parse(updateValues);
        console.log('Parsed updateValues from string:', updateValues);
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid updateValues format. Must be a valid JSON object.' },
          { status: 400 }
        );
      }
    }

    // Parse updateAllMatches if it's a string
    if (typeof updateAllMatches === 'string') {
      updateAllMatches = updateAllMatches === 'true' || updateAllMatches === '1';
    }

    console.log('Parsed params (final):', { spreadsheetId, sheetName, filters, updateValues, updateAllMatches });

    // Validate inputs
    if (!spreadsheetId || !sheetName || !filters || !Array.isArray(filters) || !updateValues) {
      return NextResponse.json(
        {
          error: 'Missing required fields: spreadsheetId, sheetName, filters, updateValues',
          received: {
            spreadsheetId: !!spreadsheetId,
            sheetName: !!sheetName,
            filters: !!filters,
            filtersIsArray: Array.isArray(filters),
            updateValues: !!updateValues
          }
        },
        { status: 400 }
      );
    }

    // Get the Authorization header
    const authHeader = request.headers.get('authorization');
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
        success: false,
        message: 'Sheet is empty',
        updatedRows: 0
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

    // Validate that all update columns exist
    for (const columnName of Object.keys(updateValues)) {
      if (columnIndexMap[columnName] === undefined) {
        return NextResponse.json(
          { error: `Column '${columnName}' not found in sheet. Available columns: ${headers.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Find matching rows and their row numbers (1-indexed, +2 because of header and 0-based array)
    const matchedRowIndices: number[] = [];

    rows.forEach((row, index) => {
      // All filters must match (AND logic)
      const matches = filters.every((filter: any) => {
        const columnIndex = columnIndexMap[filter.columnName];
        const cellValue = row[columnIndex] || '';
        return cellValue.toString().toLowerCase().includes(filter.searchValue.toString().toLowerCase());
      });

      if (matches) {
        matchedRowIndices.push(index + 2); // +2 because: +1 for header, +1 for 1-indexed
      }
    });

    if (matchedRowIndices.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No matching rows found',
        updatedRows: 0
      });
    }

    // Limit to first match if updateAllMatches is false
    const rowsToUpdate = updateAllMatches ? matchedRowIndices : [matchedRowIndices[0]];

    console.log('Rows to update:', rowsToUpdate);

    // Update each matched row
    const updatePromises = rowsToUpdate.map(async (rowNumber) => {
      // Build the new row data
      const existingRow = values[rowNumber - 1]; // Convert to 0-indexed
      const updatedRow = [...existingRow];

      // Update only the specified columns
      for (const [columnName, newValue] of Object.entries(updateValues)) {
        const columnIndex = columnIndexMap[columnName];
        updatedRow[columnIndex] = newValue;
      }

      // Update this row in Google Sheets
      const range = `${sheetName}!A${rowNumber}:${String.fromCharCode(65 + headers.length - 1)}${rowNumber}`;
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [updatedRow]
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        console.error(`Failed to update row ${rowNumber}:`, errorData);
        return { rowNumber, success: false, error: errorData };
      }

      const updateData = await updateResponse.json();
      return { rowNumber, success: true, data: updateData };
    });

    const results = await Promise.all(updatePromises);

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failedCount === 0,
      updatedRows: successCount,
      failedRows: failedCount,
      matchedRowNumbers: rowsToUpdate,
      results: results
    });

  } catch (error) {
    console.error('Sheet update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update sheet' },
      { status: 500 }
    );
  }
}
