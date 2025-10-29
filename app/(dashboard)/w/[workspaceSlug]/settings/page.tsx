'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Settings, Building2, FolderKanban, Users, Key } from 'lucide-react';
import { WorkspacesTab } from './tabs/workspaces-tab';
import { ProjectsTab } from './tabs/projects-tab';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground mt-1">Manage your workspace, projects, and preferences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        <Tabs defaultValue="workspaces" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="workspaces" className="gap-2">
              <Building2 className="w-4 h-4" />
              Workspaces
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="w-4 h-4" />
              Projects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workspaces" className="space-y-6">
            <WorkspacesTab />
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <ProjectsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
