/** @jsxImportSource react */
import { useState } from 'react';
import { Button } from './ui/button.react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card.react';

export function DashboardPanel() {
  const [clicks, setClicks] = useState(0);

  return (
    <div className="space-y-8">
      {/* Main Dashboard Card */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Octane + React + shadcn/ui</CardTitle>
          <CardDescription>
            This is a React component running inside your Octane app via ReactCompat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You can use any React component from shadcn/ui or build your own React components and use them with ReactCompat.
            Each React island adds its own root and scheduling overhead, so prefer boundaries around useful subtrees.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Features</h3>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>✓ Octane compiled components (.tsrx)</li>
                <li>✓ React 19 components (this panel)</li>
                <li>✓ Cloudflare Workers integration</li>
                <li>✓ Tailwind CSS styling</li>
                <li>✓ shadcn/ui components</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Component */}
      <Card>
        <CardHeader>
          <CardTitle>React State Demo</CardTitle>
          <CardDescription>
            This button state is managed by React, not Octane
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Clicks: <span className="font-semibold text-foreground">{clicks}</span>
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={() => setClicks(clicks + 1)} variant="default">
            Click Me
          </Button>
          <Button onClick={() => setClicks(0)} variant="outline">
            Reset
          </Button>
        </CardFooter>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Next steps to customize your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Add more shadcn components:</h4>
            <code className="bg-muted p-2 rounded text-xs block mb-2 overflow-x-auto">
              npx shadcn-ui@latest add [component-name]
            </code>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Deploy to Cloudflare:</h4>
            <code className="bg-muted p-2 rounded text-xs block mb-2 overflow-x-auto">
              pnpm run build && npx wrangler deploy
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
