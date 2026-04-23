import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { useUsers } from '../useUsers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import React from 'react';

// Setup MSW server
const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

// Factory function
const createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'mockuser',
  ...overrides,
});

describe('useUsers', () => {
  describe('initial data fetching', () => {
    it('should fetch knowledge managers on initialization', async () => {
      // ARRANGE
      const mockUsers = [createMockUser({ id: 1, username: 'Manager One' })];
      server.use(
        http.get('*/kb/users/', () => {
          return HttpResponse.json(mockUsers);
        })
      );

      // ACT
      const { result } = renderHook(() => useUsers(), { wrapper });

      // ASSERT
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.managers).toHaveLength(1);
      expect(result.current.managers[0].username).toBe('Manager One');
    });
  });

  describe('error handling', () => {
    it('should return isError as true when fetching users fails', async () => {
      // ARRANGE
      server.use(
        http.get('*/kb/users/', () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      // ACT
      const { result } = renderHook(() => useUsers(), { wrapper });

      // ASSERT
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
