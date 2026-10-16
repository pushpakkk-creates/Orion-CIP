import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorStatus } from './errors';
import { clearDashboardQueries } from './workspaceQueries';
import api from './client';
import type {
  Workspace,
  WorkspaceAccessTokenResponse,
  WorkspaceListResponse,
  OwnerAccessStatus,
  Scenario,
  CreateWorkspaceInput,
} from '../types/workspace';


export function useWorkspaces() {
  return useQuery<WorkspaceListResponse>({
    queryKey: ['workspaces'],
    queryFn: ({ signal }) => api.get<WorkspaceListResponse>('/workspaces', { signal }),
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error);
      if (status === 401 || status === 403 || status === 503) return false;
      return failureCount < 3;
    },
    refetchInterval: (query) => {
      const list = query.state.data;
      return list?.workspaces.some((ws) => ws.status === 'generating')
        ? 2000
        : false;
    },
  });
}

export function useWorkspace(id: string | null) {
  return useQuery<Workspace>({
    queryKey: ['workspaces', id],
    queryFn: ({ signal }) => api.get<Workspace>(`/workspaces/${id}`, { signal }),
    enabled: !!id,
    retry: (failureCount, error) => {
      if (getApiErrorStatus(error) === 404) return false;
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchInterval: (query) => {
      return query.state.data?.status === 'generating' ? 2000 : false;
    },
  });
}

export function useScenarios() {
  return useQuery<Scenario[]>({
    queryKey: ['workspaces', 'scenarios'],
    queryFn: ({ signal }) => api.get<Scenario[]>('/workspaces/scenarios', { signal }),
  });
}

export function useOwnerAccessStatus() {
  return useQuery<OwnerAccessStatus>({
    queryKey: ['workspaces', 'owner-access'],
    queryFn: ({ signal }) => api.get<OwnerAccessStatus>('/workspaces/owner-access', { signal }),
  });
}

export function useCreateOwnerAccess() {
  const queryClient = useQueryClient();
  return useMutation<OwnerAccessStatus, Error, string>({
    mutationFn: (passcode) => api.post('/workspaces/owner-access', { passcode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'owner-access'] });
    },
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation<Workspace, Error, CreateWorkspaceInput>({
    mutationFn: (body) => api.post('/workspaces', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}


export function useCreateCsvWorkspace() {
  const queryClient = useQueryClient();
  return useMutation<Workspace, Error, { file: File; name: string; industry?: string }>({
    mutationFn: async ({ file, name, industry = 'Technology' }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('name', name);
      form.append('industry', industry);
      const headers = new Headers();
      const adminToken = localStorage.getItem('orion_admin_token') ||
        import.meta.env?.VITE_ADMIN_API_TOKEN || import.meta.env?.VITE_ADMIN_TOKEN;
      if (adminToken) headers.set('X-Admin-Token', adminToken);
      const apiBase = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
      const response = await fetch(`${apiBase || ''}/api/workspaces/upload-csv`, { method: 'POST', headers, body: form });
      const raw = await response.text();
      let data: unknown = raw || undefined;
      if (raw) { try { data = JSON.parse(raw); } catch { /* plain-text proxy error */ } }
      if (!response.ok) throw new Error(typeof data === 'object' && data !== null && 'detail' in data ? String((data as { detail: unknown }).detail) : `CSV upload failed (${response.status})`);
      return data as Workspace;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useStartSyntheticWorkspace() {
  const queryClient = useQueryClient();
  return useMutation<Workspace, Error>({
    mutationFn: () => api.post('/workspaces/synthetic'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useGenerateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation<Workspace, Error, string>({
    mutationFn: (workspaceId) => api.post(`/workspaces/${workspaceId}/generate`),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      clearDashboardQueries(queryClient, workspaceId);
    },
  });
}

export function useRotateWorkspaceToken() {
  return useMutation<WorkspaceAccessTokenResponse, Error, string>({
    mutationFn: (workspaceId) => api.post(`/workspaces/${workspaceId}/access-token`),
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (workspaceId) => {
      await api.delete(`/workspaces/${workspaceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
