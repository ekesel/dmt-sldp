import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { useMetadata } from '../useMetadata';
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

// Factory functions
const createMockCategory = (overrides = {}) => ({
  id: 1,
  name: 'Team',
  ...overrides,
});

const createMockValue = (overrides = {}) => ({
  id: 10,
  category: 1,
  value: 'Alpha',
  ...overrides,
});

describe('useMetadata', () => {
  describe('initial data fetching', () => {
    it('should fetch categories and metadata values on initialization', async () => {
      // ARRANGE
      server.use(
        http.get('*/kb/metadata/categories/', () => {
          return HttpResponse.json([createMockCategory()]);
        }),
        http.get('*/kb/metadata/values/', () => {
          return HttpResponse.json([createMockValue()]);
        }),
        http.get('*/kb/metadata/', () => {
          return HttpResponse.json([]);
        })
      );

      // ACT
      const { result } = renderHook(() => useMetadata(), { wrapper });

      // ASSERT
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.categories).toHaveLength(1);
      expect(result.current.allValues).toHaveLength(1);
    });
  });

  describe('mutations', () => {
    it('should call the correct endpoint when adding a new value', async () => {
      // ARRANGE
      let capturedBody: any;
      server.use(
        http.post('*/kb/metadata/values/', async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(createMockValue({ value: 'New Value' }));
        })
      );
      const { result } = renderHook(() => useMetadata(), { wrapper });

      // ACT
      await act(async () => {
        await result.current.addValue({ category: 1, value: 'New Value' });
      });

      // ASSERT
      expect(capturedBody).toEqual({ category: 1, value: 'New Value' });
    });

    it('should call the correct endpoint when creating a new category', async () => {
      // ARRANGE
      let capturedBody: any;
      server.use(
        http.post('*/kb/metadata/categories/', async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(createMockCategory({ name: 'New Category' }));
        })
      );
      const { result } = renderHook(() => useMetadata(), { wrapper });

      // ACT
      await act(async () => {
        await result.current.addCategory({ name: 'New Category' });
      });

      // ASSERT
      expect(capturedBody).toEqual({ name: 'New Category' });
    });
  });

  describe('error handling', () => {
    it('should return isError as true when fetching categories fails', async () => {
      // ARRANGE
      server.use(
        http.get('*/kb/metadata/categories/', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      // ACT
      const { result } = renderHook(() => useMetadata(), { wrapper });

      // ASSERT
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
