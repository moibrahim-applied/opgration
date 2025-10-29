'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  iconSvg?: string;
  authType: string;
}



export default function IntegrationsPage() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIntegrations = integrations.filter(integration =>
    integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    integration.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [
    { id: 'all', name: 'All categories' },
    { id: 'communication', name: 'Communication' },
    { id: 'storage', name: 'Data & Storage' },
    { id: 'productivity', name: 'Productivity' },
    { id: 'developer', name: 'Developer Tools' },
  ];

  const filterTabs = [
    { id: 'all', name: 'All Types' },
    { id: 'regular', name: 'Regular' },
    { id: 'trigger', name: 'Trigger' },
    { id: 'core', name: 'Core Nodes' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b bg-card relative overflow-hidden">
        {/* Gradient Orb Background */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-primary/30 via-secondary/20 to-transparent blur-3xl rounded-full"></div>
          <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent blur-3xl rounded-full"></div>
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent blur-3xl rounded-full"></div>
        </div>

        <div className="px-8 py-16 max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            One Unified API that connects to 1000s of Services
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Optimize your workflows with these top software integrations. Seamlessly move and transform data between different apps with Opgration.
          </p>
        </div>
      </div>

      <div className="px-8 py-12 max-w-7xl mx-auto">
        {/* Search & Filters */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-8">
            Connect anything to everything
          </h2>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for workflows, nodes, tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-base rounded-xl"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-3 mb-8">
            {filterTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={tab.id === 'all' ? 'secondary' : 'ghost'}
                className="rounded-lg px-6"
              >
                {tab.name}
              </Button>
            ))}
          </div>

          {/* Categories & Integrations Grid */}
          <div className="grid grid-cols-12 gap-8">
            {/* Sidebar - Categories */}
            <div className="col-span-3">
              <h3 className="text-foreground font-semibold mb-4">Categories</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted mb-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border"
                  />
                  <span className="text-sm text-foreground">Partner built</span>
                </div>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedCategory === category.id
                          ? 'border-primary bg-primary'
                          : 'border-border'
                      }`}>
                        {selectedCategory === category.id && (
                          <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                        )}
                      </div>
                      <span className="text-sm">{category.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content - Integrations */}
            <div className="col-span-9">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-foreground">
                  {filteredIntegrations.length} integrations
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort:</span>
                  <select className="bg-background border rounded-lg px-4 py-2 text-sm text-foreground outline-none cursor-pointer">
                    <option>Popularity</option>
                    <option>Name A-Z</option>
                    <option>Name Z-A</option>
                    <option>Recently Added</option>
                  </select>
                </div>
              </div>

              {/* Integrations Grid */}
              {filteredIntegrations.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">
                    {searchQuery ? 'No integrations found matching your search' : 'No integrations available'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-5">
                  {filteredIntegrations.map((integration) => {
                    // Use n8n SVG URLs directly for better reliability
                    const n8nIcons: Record<string, string> = {
                      'google-drive': 'https://n8n.io/nodes/google-drive.svg',
                      'dropbox': 'https://n8n.io/nodes/dropbox.svg',
                      'slack': 'https://n8n.io/nodes/slack.svg',
                    };

                    const iconUrl = n8nIcons[integration.slug] || integration.logoUrl || '';

                    return (
                      <button
                        key={integration.id}
                        onClick={() => window.location.href = `/w/${workspaceSlug}/integrations/${integration.slug}`}
                        className="group bg-card hover:bg-muted/50 border hover:border-primary/50 rounded-xl p-6 transition-all duration-200 text-left shadow-sm hover:shadow-md"
                      >
                        {/* Icon */}
                        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg border">
                          <img
                            src={iconUrl}
                            alt={integration.name}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent && !parent.querySelector('.fallback-text')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-text text-2xl font-bold text-gray-900';
                                fallback.textContent = integration.name.charAt(0);
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        </div>

                        {/* Name */}
                        <h4 className="text-foreground font-semibold text-base mb-2 group-hover:text-primary transition-colors">
                          {integration.name}
                        </h4>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {integration.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}