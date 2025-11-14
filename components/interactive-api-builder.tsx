'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle, Sparkles, Code, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

interface Action {
  id: string;
  name: string;
  slug: string;
  description: string;
  httpMethod: string;
  requestSchema?: {
    type: string;
    properties: Record<string, {
      type: string;
      required?: boolean;
      default?: any;
      description?: string;
      enum?: any[];
      items?: {
        type: string;
        properties?: Record<string, {
          type: string;
          description?: string;
        }>;
      };
    }>;
  };
}

interface InteractiveApiBuilderProps {
  action: Action;
  connectionId: string;
  workspaceId: string;
  projectId: string;
  baseUrl: string;
  onExecute?: (parameters: Record<string, any>) => void;
  executing?: boolean;
  executionResult?: any;
}

export function InteractiveApiBuilder({
  action,
  connectionId,
  workspaceId,
  projectId,
  baseUrl,
  onExecute,
  executing = false,
  executionResult,
}: InteractiveApiBuilderProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(true);

  // Initialize parameters with defaults
  useEffect(() => {
    if (action.requestSchema?.properties) {
      const defaults: Record<string, any> = {};
      Object.entries(action.requestSchema.properties).forEach(([key, prop]) => {
        if (prop.default !== undefined) {
          defaults[key] = prop.default;
        }
      });
      setParameters(defaults);
    }
  }, [action]);

  const updateParameter = (key: string, value: any) => {
    setParameters({ ...parameters, [key]: value });
  };

  const getParameterValue = (key: string, prop: any): any => {
    if (parameters[key] !== undefined) {
      return parameters[key];
    }
    return prop.default !== undefined ? prop.default : '';
  };

  // Generate the API payload
  const apiPayload = {
    workspace_id: workspaceId,
    project_id: projectId,
    connection_id: connectionId,
    action: action.slug,
    parameters: parameters,
  };

  // Generate the cURL command
  const apiEndpoint = `${baseUrl}/api/v2/execute`;
  const curlCommand = `curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key" \\
  -d '${JSON.stringify(apiPayload, null, 2).replace(/\n/g, '\n  ')}'`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderParameterInput = (key: string, prop: any) => {
    const value = getParameterValue(key, prop);

    // Handle boolean types with select
    if (prop.type === 'boolean') {
      return (
        <Select
          value={value?.toString() || 'false'}
          onValueChange={(val) => updateParameter(key, val === 'true')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select option..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes / True</SelectItem>
            <SelectItem value="false">No / False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Handle enum types with select
    if (prop.enum && Array.isArray(prop.enum)) {
      return (
        <Select
          value={value?.toString() || ''}
          onValueChange={(val) => updateParameter(key, val)}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${key}...`} />
          </SelectTrigger>
          <SelectContent>
            {prop.enum.map((option: any) => (
              <SelectItem key={option} value={option.toString()}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Handle arrays of objects with known schema - Dynamic Form Builder
    // Also detect common patterns like "filters" even without explicit schema
    const isArrayOfObjects = prop.type === 'array' && (
      (prop.items?.type === 'object' && prop.items?.properties) ||
      key.toLowerCase().includes('filter')
    );

    if (isArrayOfObjects) {
      const arrayValue = Array.isArray(value) ? value : [];

      // Try to infer schema from description or use common patterns
      let itemProperties = prop.items?.properties;

      // Common pattern detection for filters and other array structures
      if (!itemProperties && key.toLowerCase().includes('filter')) {
        // Default filter structure for Google Sheets and similar
        itemProperties = {
          columnName: { type: 'string', description: 'Column name to filter' },
          searchValue: { type: 'string', description: 'Value to search for' }
        };
      }

      // Try to parse structure from example in description
      if (!itemProperties && prop.description) {
        try {
          // Look for JSON examples in description
          const jsonMatch = prop.description.match(/\[[\s\S]*?\{[\s\S]*?\}[\s\S]*?\]/);
          if (jsonMatch) {
            const example = JSON.parse(jsonMatch[0]);
            if (Array.isArray(example) && example.length > 0 && typeof example[0] === 'object') {
              const tempProperties: Record<string, any> = {};
              Object.keys(example[0]).forEach(key => {
                tempProperties[key] = {
                  type: typeof example[0][key] === 'number' ? 'number' : 'string',
                  description: `Enter ${key}`
                };
              });
              itemProperties = tempProperties;
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      if (!itemProperties) {
        // Fallback to textarea if we can't infer the structure
        return (
          <Textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateParameter(key, parsed);
              } catch {
                updateParameter(key, e.target.value);
              }
            }}
            placeholder={prop.type === 'array' ? '["value1", "value2"]' : '{"key": "value"}'}
            className="font-mono text-sm min-h-[100px]"
          />
        );
      }

      const addArrayItem = () => {
        const newItem: Record<string, any> = {};
        Object.keys(itemProperties).forEach(propKey => {
          newItem[propKey] = '';
        });
        updateParameter(key, [...arrayValue, newItem]);
      };

      const updateArrayItem = (index: number, itemKey: string, itemValue: any) => {
        const newArray = [...arrayValue];
        newArray[index] = { ...newArray[index], [itemKey]: itemValue };
        updateParameter(key, newArray);
      };

      const removeArrayItem = (index: number) => {
        const newArray = arrayValue.filter((_, i) => i !== index);
        updateParameter(key, newArray);
      };

      return (
        <div className="space-y-3">
          {arrayValue.map((item: any, index: number) => (
            <Card key={index} className="p-4 bg-muted/30">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Item {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeArrayItem(index)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                {Object.entries(itemProperties).map(([propKey, propDef]: [string, any]) => (
                  <div key={propKey} className="space-y-1">
                    <Label className="text-xs font-medium">{propKey}</Label>
                    <Input
                      type="text"
                      value={item[propKey] || ''}
                      onChange={(e) => updateArrayItem(index, propKey, e.target.value)}
                      placeholder={propDef.description || `Enter ${propKey}...`}
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addArrayItem}
            className="w-full gap-2 border-dashed"
          >
            <Plus className="w-4 h-4" />
            Add {key}
          </Button>
        </div>
      );
    }

    // Handle arrays and objects with textarea (fallback)
    if (prop.type === 'array' || prop.type === 'object') {
      return (
        <div className="space-y-2">
          <Textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              const inputValue = e.target.value;

              // Try to auto-fix common JSON issues
              let fixedValue = inputValue.trim()
                // Remove trailing commas before closing brackets/braces
                .replace(/,(\s*[\]}])/g, '$1');

              try {
                const parsed = JSON.parse(fixedValue);
                updateParameter(key, parsed);
              } catch {
                // If parsing fails, keep as string - backend will try to parse it
                updateParameter(key, inputValue);
              }
            }}
            placeholder={
              prop.type === 'array'
                ? prop.default
                  ? JSON.stringify(prop.default, null, 2)
                  : '[["value1", "value2"]]'
                : '{"key": "value"}'
            }
            className="font-mono text-sm min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">
            💡 Enter as JSON. Example: {prop.default ? JSON.stringify(prop.default) : prop.type === 'array' ? '[["row1col1", "row1col2"], ["row2col1", "row2col2"]]' : '{"key": "value"}'}
          </p>
        </div>
      );
    }

    // Handle number types
    if (prop.type === 'number' || prop.type === 'integer') {
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => updateParameter(key, parseFloat(e.target.value))}
          placeholder={prop.description || `Enter ${key}...`}
        />
      );
    }

    // Default to text input
    return (
      <Input
        type="text"
        value={value}
        onChange={(e) => updateParameter(key, e.target.value)}
        placeholder={prop.description || `Enter ${key}...`}
      />
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Side - Interactive Form Builder */}
      <div className="space-y-6">
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle>Build Your Request</CardTitle>
            </div>
            <CardDescription>
              Fill in the parameters below to build your API request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Action Info */}
            <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {action.httpMethod?.toUpperCase() || 'POST'}
                </Badge>
                <span className="font-semibold text-sm">{action.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>

            {/* Parameters Form */}
            {action.requestSchema?.properties && Object.keys(action.requestSchema.properties).length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground">PARAMETERS</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {Object.entries(action.requestSchema.properties).map(([key, prop]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key} className="flex items-center gap-2">
                      <span className="font-mono text-sm">{key}</span>
                      {prop.required && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0">
                          Required
                        </Badge>
                      )}
                      {!prop.required && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          Optional
                        </Badge>
                      )}
                    </Label>
                    {prop.description && (
                      <p className="text-xs text-muted-foreground -mt-1">{prop.description}</p>
                    )}
                    {renderParameterInput(key, prop)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-muted/30 rounded-lg border-2 border-dashed">
                <p className="text-sm text-muted-foreground">
                  No parameters required for this action
                </p>
              </div>
            )}

            {/* Execute Button */}
            {onExecute && (
              <Button
                onClick={() => onExecute(parameters)}
                disabled={executing}
                className="w-full h-12"
                size="lg"
              >
                {executing ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Test This Request
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Execution Results */}
        {executionResult && (
          <Card className="border-2 border-green-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <CardTitle>Execution Result</CardTitle>
              </div>
              <CardDescription>
                Response from your API request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-slate-950 text-slate-50 rounded-lg text-xs overflow-x-auto font-mono border border-slate-800 max-h-[400px] overflow-y-auto">
                {JSON.stringify(executionResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Side - Live API Documentation */}
      <div className="space-y-6">
        <Card className="border-2 border-green-500/20 sticky top-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-green-500" />
                <CardTitle>Live API Preview</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCode(!showCode)}
              >
                {showCode ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <CardDescription>
              Your API request updates as you type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCode && (
              <>
                {/* Endpoint */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">ENDPOINT</Label>
                  <div className="p-3 bg-slate-950 text-slate-50 rounded-lg font-mono text-xs break-all border border-slate-800">
                    POST {apiEndpoint}
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">HEADERS</Label>
                  <div className="space-y-2">
                    <div className="p-2 bg-slate-950 text-slate-50 rounded-lg font-mono text-xs border border-slate-800">
                      <span className="text-green-400">Content-Type:</span> application/json
                    </div>
                    <div className="p-2 bg-slate-950 text-slate-50 rounded-lg font-mono text-xs border border-slate-800">
                      <span className="text-green-400">X-API-Key:</span> your-api-key
                    </div>
                  </div>
                </div>

                {/* Request Body */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">REQUEST BODY</Label>
                  <pre className="p-3 bg-slate-950 text-slate-50 rounded-lg text-xs overflow-x-auto font-mono border border-slate-800 max-h-[300px] overflow-y-auto">
                    {JSON.stringify(apiPayload, null, 2)}
                  </pre>
                </div>

                {/* cURL Command */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">CURL COMMAND</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(curlCommand)}
                      className="h-7 gap-2"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="p-3 bg-slate-950 text-slate-50 rounded-lg text-xs overflow-x-auto font-mono border border-slate-800 max-h-[200px] overflow-y-auto">
                    {curlCommand}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Helper Info */}
        <Card className="border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">How it works</p>
                <p className="text-xs text-muted-foreground">
                  As you fill in the parameters on the left, the API documentation on the right updates in real-time.
                  You can copy the cURL command or use the request body structure to integrate with your application.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
