import { IntegrationAction } from '@/src/domain';

export interface ExecuteActionInput {
  action: IntegrationAction;
  baseUrl: string;
  accessToken: string;
  payload: Record<string, any>;
}

export interface ExecuteActionResult {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
}

export class ApiExecutionService {
  /**
   * Execute an external API call based on action configuration
   */
  async execute(input: ExecuteActionInput): Promise<ExecuteActionResult> {
    try {
      const { url, headers, body, isMultipart } = this.prepareRequest(input);

      console.log('Prepared request:', {
        url,
        method: input.action.httpMethod,
        headers,
        body: isMultipart ? '[multipart data]' : body,
        tokenPreview: input.accessToken.substring(0, 20) + '...'
      });

      // Don't send body for GET/HEAD requests
      const fetchOptions: RequestInit = {
        method: input.action.httpMethod,
        headers,
      };

      if (input.action.httpMethod.toUpperCase() !== 'GET' && input.action.httpMethod.toUpperCase() !== 'HEAD') {
        // For multipart, body is already a string
        if (isMultipart) {
          fetchOptions.body = body as string;
        } else {
          fetchOptions.body = body ? JSON.stringify(body) : undefined;
        }
      }

      const response = await fetch(url, fetchOptions);

      const responseData = await this.parseResponse(response);

      return {
        success: response.ok,
        data: responseData,
        statusCode: response.status,
        error: response.ok ? undefined : responseData?.error || response.statusText,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Prepare the request URL, headers, and body based on action config
   */
  private prepareRequest(input: ExecuteActionInput) {
    const { action, baseUrl, accessToken, payload } = input;

    // Build URL - replace path parameters first
    let endpointPath = action.endpointPath;
    // Replace {{variable}} in the path with values from payload
    endpointPath = endpointPath.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
      return payload[varName] ?? '';
    });

    // Check if endpoint is an absolute URL (for custom internal endpoints)
    let url: string;
    if (endpointPath.startsWith('http://') || endpointPath.startsWith('https://')) {
      url = endpointPath;
    } else {
      url = `${baseUrl}${endpointPath}`;
    }

    // Check if this is a multipart upload
    const isMultipartUpload = url.includes('uploadType=multipart');

    // Apply transformations
    const transformConfig = action.transformConfig;
    let headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    let body: Record<string, any> | string | undefined;
    let isMultipart = false;

    // Handle Google Drive multipart upload specially
    if (isMultipartUpload && payload.fileName && payload.fileContent) {
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: payload.fileName,
        mimeType: payload.mimeType || 'text/plain',
      };

      // Add parent folder if provided
      if (payload.parentFolderId) {
        (metadata as any).parents = [payload.parentFolderId];
      }

      // Check if content is base64 encoded (for binary files)
      // Base64 pattern: only contains A-Z, a-z, 0-9, +, /, and = for padding
      const isBase64 = /^[A-Za-z0-9+/=\s]+$/.test(payload.fileContent.trim());

      let bodyParts: (string | Buffer)[];

      if (isBase64 && payload.fileContent.length > 100) {
        // For base64 binary content, we need to build multipart with Buffer
        const metadataPart =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata);

        const contentHeader =
          delimiter +
          `Content-Type: ${payload.mimeType || 'text/plain'}\r\n` +
          'Content-Transfer-Encoding: base64\r\n\r\n';

        // Keep base64 as-is, Google Drive will decode it
        bodyParts = [
          Buffer.from(metadataPart, 'utf-8'),
          Buffer.from(contentHeader, 'utf-8'),
          Buffer.from(payload.fileContent.replace(/\s/g, ''), 'utf-8'),
          Buffer.from(closeDelimiter, 'utf-8')
        ];

        body = Buffer.concat(bodyParts).toString('utf-8');
      } else {
        // Plain text content
        body =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${payload.mimeType || 'text/plain'}\r\n\r\n` +
          payload.fileContent +
          closeDelimiter;
      }

      headers['Content-Type'] = `multipart/related; boundary=${boundary}`;
      isMultipart = true;
    } else if (transformConfig) {
      // Transform request headers
      if (transformConfig.request?.headers) {
        const transformedHeaders = this.applyTransform(
          transformConfig.request.headers,
          payload
        );
        headers = { ...headers, ...transformedHeaders };
      }

      // Transform request body
      if (transformConfig.request?.body) {
        body = this.applyTransform(transformConfig.request.body, payload);
      } else {
        body = payload;
      }

      // Transform URL params
      if (transformConfig.request?.params) {
        const params = this.applyTransform(transformConfig.request.params, payload);
        const queryString = new URLSearchParams(params as any).toString();
        url = `${url}?${queryString}`;
      }

      // For GET/HEAD requests, always clear the body
      if (action.httpMethod.toUpperCase() === 'GET' || action.httpMethod.toUpperCase() === 'HEAD') {
        body = undefined;
      }
    } else {
      // No transform config
      if (action.httpMethod.toUpperCase() === 'GET' || action.httpMethod.toUpperCase() === 'HEAD') {
        // For GET/HEAD, put payload in URL params
        if (payload && Object.keys(payload).length > 0) {
          const queryString = new URLSearchParams(payload as any).toString();
          url = `${url}?${queryString}`;
        }
        body = undefined;
      } else {
        body = payload;
      }
    }

    return { url, headers, body, isMultipart };
  }

  /**
   * Apply template transformations (replace {{variable}} with actual values)
   */
  private applyTransform(
    template: Record<string, any>,
    values: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(template)) {
      // Handle arrays (like parents: ["{{parentFolderId}}"])
      if (Array.isArray(value)) {
        const transformedArray = value.map(item => {
          if (typeof item === 'string' && item.includes('{{')) {
            const replaced = item.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
              return values[varName] ?? '';
            });
            // Skip if replacement resulted in empty string
            return replaced || null;
          }
          return item;
        }).filter(item => item !== null && item !== '');

        // Only add array if it has items
        if (transformedArray.length > 0) {
          result[key] = transformedArray;
        }
      }
      // Handle strings
      else if (typeof value === 'string' && value.includes('{{')) {
        // Check if it's a pure template variable (e.g., "{{filters}}" with no other text)
        const pureTemplateMatch = value.match(/^\{\{(\w+)\}\}$/);

        if (pureTemplateMatch) {
          // For pure templates, use the actual value directly (preserves arrays, objects, etc.)
          const varName = pureTemplateMatch[1];
          const actualValue = values[varName];
          if (actualValue !== undefined && actualValue !== null && actualValue !== '') {
            result[key] = actualValue;
          }
        } else {
          // For templates mixed with text, do string replacement
          const replaced = value.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
            const val = values[varName];
            // Convert to string if it's not already
            return val !== undefined && val !== null ? String(val) : '';
          });
          // Only add if not empty after replacement
          if (replaced) {
            result[key] = replaced;
          }
        }
      }
      // Handle other values as-is
      else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Parse response handling different content types
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  }
}