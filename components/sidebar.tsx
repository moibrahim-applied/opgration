'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Network,
  Key,
  Link2,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronDown,
  Building2,
  Plus,
  FolderKanban,
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface SidebarProps {
  user?: {
    email?: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentWorkspaceSlug, setCurrentWorkspaceSlug] = useState<string>('');
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once, not on every pathname change
    if (!initialized) {
      initializeSidebar();
    } else {
      // Just update workspace slug from URL on navigation
      const match = pathname?.match(/^\/w\/([^\/]+)/);
      if (match && match[1] !== currentWorkspaceSlug) {
        setCurrentWorkspaceSlug(match[1]);
        // Fetch projects for new workspace
        const newWorkspace = workspaces.find(w => w.slug === match[1]);
        if (newWorkspace) {
          fetchProjectsForWorkspace(newWorkspace.id);
        }
      }
    }
  }, [pathname, initialized]);

  const fetchProjectsForWorkspace = async (workspaceId: string) => {
    try {
      const projectsRes = await fetch(`/api/workspaces/${workspaceId}/projects`);
      const projectsData = await projectsRes.json();
      const fetchedProjects = projectsData.projects || [];
      setProjects(fetchedProjects);

      // Auto-select first project
      const savedProjectId = localStorage.getItem('selectedProjectId');
      if (savedProjectId && fetchedProjects.find((p: Project) => p.id === savedProjectId)) {
        setCurrentProjectId(savedProjectId);
      } else if (fetchedProjects.length > 0) {
        const firstProject = fetchedProjects[0];
        setCurrentProjectId(firstProject.id);
        localStorage.setItem('selectedProjectId', firstProject.id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const initializeSidebar = async () => {
    try {
      // Extract workspace slug from URL
      const match = pathname?.match(/^\/w\/([^\/]+)/);
      if (match) {
        setCurrentWorkspaceSlug(match[1]);
      }

      // Fetch workspaces
      const res = await fetch('/api/workspaces');
      const data = await res.json();
      const fetchedWorkspaces = data.workspaces || [];
      setWorkspaces(fetchedWorkspaces);

      // Find current workspace
      const currentWs = match ? fetchedWorkspaces.find((w: Workspace) => w.slug === match[1]) : null;

      if (currentWs) {
        await fetchProjectsForWorkspace(currentWs.id);
      }

      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize sidebar:', error);
      setInitialized(true);
    }
  };

  const currentWorkspace = workspaces.find(w => w.slug === currentWorkspaceSlug);
  const currentProject = projects.find(p => p.id === currentProjectId);

  const navigation = [
    {
      name: 'Dashboard',
      href: `/w/${currentWorkspaceSlug}/dashboard`,
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Integrations',
      href: `/w/${currentWorkspaceSlug}/integrations`,
      icon: Network,
      badge: null,
    },
    {
      name: 'Connections',
      href: `/w/${currentWorkspaceSlug}/connections`,
      icon: Link2,
      badge: null,
    },
    {
      name: 'Credentials',
      href: `/w/${currentWorkspaceSlug}/credentials`,
      icon: Key,
      badge: null,
    },
    {
      name: 'API Keys',
      href: `/w/${currentWorkspaceSlug}/api-keys`,
      icon: Key,
      badge: null,
    },
  ];

  const bottomNavigation = [
    {
      name: 'Settings',
      href: `/w/${currentWorkspaceSlug}/settings`,
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    if (!pathname || !currentWorkspaceSlug) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleWorkspaceChange = (workspace: Workspace) => {
    setShowWorkspaceDropdown(false);
    // Navigate to the same page but in different workspace
    const currentPage = pathname?.split('/').slice(3).join('/') || 'integrations';
    router.push(`/w/${workspace.slug}/${currentPage}`);
  };

  const NavLink = ({ item, onClick }: { item: any; onClick?: () => void }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <button
        onClick={() => {
          router.push(item.href);
          onClick?.();
        }}
        disabled={!currentWorkspaceSlug}
        className={`
          w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed
          ${
            active
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span>{item.name}</span>
        </div>
        {item.badge && (
          <Badge variant="secondary" className="text-xs">
            {item.badge}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card z-40 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="mr-3"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">Opgration</span>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-card border-r z-50 flex flex-col
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">Opgration</h1>
            <p className="text-xs text-muted-foreground">Integration Hub</p>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Workspace</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => router.push('/workspaces')}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <button
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            disabled={workspaces.length === 0}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">
                {currentWorkspace?.name || 'Select workspace'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showWorkspaceDropdown && (
            <div className="mt-2 p-2 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {workspaces.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  No workspaces yet
                </div>
              ) : (
                workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleWorkspaceChange(workspace)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      currentWorkspaceSlug === workspace.slug
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{workspace.name}</span>
                  </button>
                ))
              )}
              <div className="border-t mt-2 pt-2">
                <button
                  onClick={() => {
                    router.push('/workspaces');
                    setShowWorkspaceDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-primary hover:bg-muted transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create workspace</span>
                </button>
              </div>
            </div>
          )}

          {/* Project Selector */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Project</span>
              {currentWorkspace && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => router.push(`/w/${currentWorkspaceSlug}/settings`)}
                  title="Manage projects"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              )}
            </div>
            <select
              value={currentProjectId}
              onChange={(e) => {
                setCurrentProjectId(e.target.value);
                localStorage.setItem('selectedProjectId', e.target.value);
              }}
              disabled={!currentWorkspace || projects.length === 0}
              className="w-full h-10 px-3 bg-muted border rounded-lg text-sm font-medium text-foreground disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-primary"
            >
              {projects.length === 0 ? (
                <option value="">No projects</option>
              ) : (
                projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink key={item.name} item={item} onClick={() => setIsOpen(false)} />
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 border-t space-y-1">
          {bottomNavigation.map((item) => (
            <NavLink key={item.name} item={item} onClick={() => setIsOpen(false)} />
          ))}
        </div>

        {/* User Section */}
        {user && (
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center">
                <span className="text-sm font-semibold text-gray-900">
                  {user.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => (window.location.href = '/auth/signout')}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        )}
      </aside>

      {/* Spacer for desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
      {/* Spacer for mobile */}
      <div className="lg:hidden h-16" />
    </>
  );
}
