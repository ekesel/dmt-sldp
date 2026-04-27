import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { users } from "../users-api";
import { createMockKnowledgeManager } from "./factories";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("users-api", () => {
  describe("listKnowledgeManagers", () => {
    describe("when API succeeds with flat array", () => {
      it("should return knowledge managers", async () => {
        // ARRANGE
        const mockManagers = [createMockKnowledgeManager({ id: 1 }), createMockKnowledgeManager({ id: 2 })];
        server.use(
          http.get("*/kb/users/", () => {
            return HttpResponse.json(mockManagers);
          })
        );

        // ACT
        const result = await users.listKnowledgeManagers();

        // ASSERT
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe(1);
      });
    });

    describe("when API succeeds with results wrapper", () => {
      it("should handle response with results wrapper", async () => {
        // ARRANGE
        const mockManagers = [createMockKnowledgeManager()];
        server.use(
          http.get("*/kb/users/", () => {
            return HttpResponse.json({ results: mockManagers });
          })
        );

        // ACT
        const result = await users.listKnowledgeManagers();

        // ASSERT
        expect(result).toEqual(mockManagers);
      });
    });

    describe("when API succeeds with data wrapper", () => {
      it("should handle response with data wrapper", async () => {
        // ARRANGE
        const mockManagers = [createMockKnowledgeManager()];
        server.use(
          http.get("*/kb/users/", () => {
            return HttpResponse.json({ data: mockManagers });
          })
        );

        // ACT
        const result = await users.listKnowledgeManagers();

        // ASSERT
        expect(result).toEqual(mockManagers);
      });
    });

    describe("when API returns empty or null response", () => {
      it("should return empty array", async () => {
        // ARRANGE
        server.use(
          http.get("*/kb/users/", () => {
            return HttpResponse.json(null);
          })
        );

        // ACT
        const result = await users.listKnowledgeManagers();

        // ASSERT
        expect(result).toEqual([]);
      });
    });

    describe("when API returns 4xx/5xx response", () => {
      it("should throw error", async () => {
        // ARRANGE
        server.use(
          http.get("*/kb/users/", () => {
            return new HttpResponse(null, { status: 401 });
          })
        );

        // ACT & ASSERT
        await expect(users.listKnowledgeManagers()).rejects.toThrow();
      });
    });
  });
});
