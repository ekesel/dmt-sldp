import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { useRecords, useRecord } from '../useKnowledgeRecords';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import React from 'react';

// Setup MSW server
const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => server.close());

// React Query Wrapper
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

// Factory functions for mock records
const createMockRecord = (overrides = {}) => ({
  id: '1',
  title: 'Test Record',
  status: 'Approved',
  ...overrides,
});

describe('useKnowledgeRecords', () => {
  beforeEach(() => {
    // Any setup before each test
  });

  describe('useRecords', () => {
    describe('when API returns data successfully', () => {
      it('should return a list of records from the API', async () => {
        // ARRANGE
        const mockRecords = [createMockRecord({ id: '1', title: 'Doc A' })];
        server.use(
          http.get('*/kb/documents/', () => {
            return HttpResponse.json({ results: mockRecords });
          })
        );

        // ACT
        const { result } = renderHook(() => useRecords(), { wrapper });

        // ASSERT
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.records).toHaveLength(1);
        expect(result.current.records[0].title).toBe('Doc A');
      });
    });

    describe('when the API fails', () => {
      it('should return isError as true', async () => {
        // ARRANGE
        server.use(
          http.get('*/kb/documents/', () => {
            return new HttpResponse(null, { status: 500 });
          })
        );

        // ACT
        const { result } = renderHook(() => useRecords(), { wrapper });

        // ASSERT
        await waitFor(() => expect(result.current.isError).toBe(true));
      });
    });

    describe('when the response is empty', () => {
      it('should return an empty array', async () => {
        // ARRANGE
        server.use(
          http.get('*/kb/documents/', () => {
            return HttpResponse.json({ results: [] });
          })
        );

        // ACT
        const { result } = renderHook(() => useRecords(), { wrapper });

        // ASSERT
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.records).toEqual([]);
      });
    });
  });

  describe('useRecord (single record)', () => {
    it('should fetch deep details for a single document ID', async () => {
      // ARRANGE
      const mockRecord = createMockRecord({ id: '10', title: 'Deep Doc' });
      server.use(
        http.get('*/kb/documents/10/', () => {
          return HttpResponse.json({ data: mockRecord });
        })
      );

      // ACT
      const { result } = renderHook(() => useRecord('10'), { wrapper });

      // ASSERT
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.record.title).toBe('Deep Doc');
    });
  });
});
