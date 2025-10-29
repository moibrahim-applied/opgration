'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export default function IntegrationsNewPage() {
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
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#1f1f3a] to-[#252542]">
      {/* Hero Section */}
      <div className="border-b border-white/10 bg-gradient-to-b from-transparent to-black/20">
        <div className="px-8 py-16 max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            One Unified API that connects to 1000s of Services
          </h1>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            Optimize your workflows with these top software integrations. Seamlessly move and transform data between different apps with Opgration.
          </p>
        </div>
      </div>

      <div className="px-8 py-12 max-w-7xl mx-auto">
        {/* Search & Filters */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-white mb-8">
            Connect anything to everything
          </h2>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search for workflows, nodes, tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-base rounded-xl focus:bg-white/10 focus:border-white/20"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-3 mb-8">
            {filterTabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={`rounded-lg px-6 ${
                  tab.id === 'all'
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.name}
              </Button>
            ))}
          </div>

          {/* Categories & Integrations Grid */}
          <div className="grid grid-cols-12 gap-8">
            {/* Sidebar - Categories */}
            <div className="col-span-3">
              <h3 className="text-white font-semibold mb-4">Categories</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 mb-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/20 bg-transparent"
                  />
                  <span className="text-sm text-gray-300">Partner built</span>
                </div>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedCategory === category.id
                          ? 'border-primary bg-primary'
                          : 'border-gray-500'
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
                <h3 className="text-xl font-semibold text-white">
                  {filteredIntegrations.length} integrations
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Sort:</span>
                  <select className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:bg-white/10 focus:border-white/20 outline-none">
                    <option>Popularity</option>
                    <option>Name A-Z</option>
                    <option>Name Z-A</option>
                    <option>Recently Added</option>
                  </select>
                </div>
              </div>

              {/* Integrations Grid */}
              <div className="grid grid-cols-3 gap-5">
                {filteredIntegrations.map((integration) => (
                  <button
                    key={integration.id}
                    onClick={() => window.location.href = `/integrations/${integration.slug}/connect`}
                    className="group bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-xl p-6 transition-all duration-200 text-left"
                  >
                    {/* Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-white/10 to-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {integration.iconSvg ? (
                        <img
                          src={integration.iconSvg}
                          alt={integration.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : integration.logoUrl ? (
                        <img
                          src={integration.logoUrl}
                          alt={integration.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg"></div>
                      )}
                    </div>

                    {/* Name */}
                    <h4 className="text-white font-semibold text-base mb-2 group-hover:text-primary transition-colors">
                      {integration.name}
                    </h4>

                    {/* Description */}
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {integration.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Empty State */}
              {filteredIntegrations.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-400 text-lg">
                    {searchQuery ? 'No integrations found matching your search' : 'No integrations available'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}