'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { XCircle } from 'lucide-react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'Unknown error occurred';

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card className="border-red-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Connection Failed</CardTitle>
          <CardDescription>
            There was a problem connecting your integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {message}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Common Issues:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>OAuth credentials not configured in .env.local</li>
              <li>Redirect URI mismatch in OAuth provider settings</li>
              <li>User denied permission during OAuth flow</li>
              <li>Invalid or expired authorization code</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">What to check:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Verify OAuth credentials are set in .env.local</li>
              <li>Check redirect URI matches in provider console</li>
              <li>Ensure the integration is properly configured</li>
              <li>Try the connection again</li>
            </ol>
          </div>

          <Button asChild className="w-full">
            <Link href="/test">Try Again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConnectionErrorPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-8 text-center">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}