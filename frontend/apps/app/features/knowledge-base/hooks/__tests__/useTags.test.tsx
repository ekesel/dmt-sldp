import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { useTags } from '../useTags';
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
const createMockTag = (overrides = {}) => ({
  id: 1,
  name: 'Mock Tag',
  ...overrides,
});

describe('useTags', () => {
  describe('initial data fetching', () => {
    it('should fetch all tags on initialization', async () => {
      // ARRANGE
      const mockTags = [createMockTag({ id: 1, name: 'Tag A' })];
      server.use(
        http.get('*/kb/tags/', () => {
          return HttpResponse.json(mockTags);
        })
      );

      // ACT
      const { result } = renderHook(() => useTags(), { wrapper });

      // ASSERT
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.tags).toHaveLength(1);
      expect(result.current.tags[0].name).toBe('Tag A');
    });
  });

  describe('mutations', () => {
    it('should call the correct endpoint when creating a new tag', async () => {
      // ARRANGE
      let capturedBody: any;
      server.use(
        http.post('*/kb/tags/', async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(createMockTag({ name: 'New Tag' }));
        })
      );
      const { result } = renderHook(() => useTags(), { wrapper });

      // ACT
      await act(async () => {
        await result.current.createTag('New Tag');
      });

      // ASSERT
      expect(capturedBody).toEqual({ name: 'New Tag' });
    });
  });

  describe('error handling', () => {
    it('should return isError as true when fetching tags fails', async () => {
      // ARRANGE
      server.use(
        http.get('*/kb/tags/', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      // ACT
      const { result } = renderHook(() => useTags(), { wrapper });

      // ASSERT
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
