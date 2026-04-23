import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { tags } from "../tags-api";
import { createMockTag } from "./factories";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("tags-api", () => {
  describe("create", () => {
    describe("when API succeeds", () => {
      it("should return mapped data with success message", async () => {
        // ARRANGE
        const mockTag = createMockTag({ name: "New Tag" });
        server.use(
          http.post("*/kb/tags/", () => {
            return HttpResponse.json(mockTag);
          })
        );

        // ACT
        const result = await tags.create("New Tag");

        // ASSERT
        expect(result.data).toEqual(mockTag);
        expect(result.status).toBe(200);
        expect(result.message).toBe("Tag Created successfully");
      });
    });

    describe("when API returns 4xx/5xx response", () => {
      it("should throw error", async () => {
        // ARRANGE
        server.use(
          http.post("*/kb/tags/", () => {
            return new HttpResponse(null, { status: 500 });
          })
        );

        // ACT & ASSERT
        await expect(tags.create("Fail Tag")).rejects.toThrow();
      });
    });
  });

  describe("getAll", () => {
    describe("when API succeeds with flat array", () => {
      it("should return all tags", async () => {
        // ARRANGE
        const mockTags = [createMockTag({ id: 1 }), createMockTag({ id: 2 })];
        server.use(
          http.get("*/kb/tags/", () => {
            return HttpResponse.json(mockTags);
          })
        );

        // ACT
        const result = await tags.getAll();

        // ASSERT
        expect(result.data).toEqual(mockTags);
        expect(result.message).toBe("Tags Fetched successfully");
      });
    });

    describe("when API succeeds with paginated results", () => {
      it("should handle response with results wrapper", async () => {
        // ARRANGE
        const mockTags = [createMockTag({ id: 1 })];
        server.use(
          http.get("*/kb/tags/", () => {
            return HttpResponse.json({ results: mockTags });
          })
        );

        // ACT
        const result = await tags.getAll();

        // ASSERT
        expect(result.data).toEqual(mockTags);
      });
    });

    describe("when API returns empty response", () => {
      it("should handle empty response", async () => {
        // ARRANGE
        server.use(
          http.get("*/kb/tags/", () => {
            return HttpResponse.json([]);
          })
        );

        // ACT
        const result = await tags.getAll();

        // ASSERT
        expect(result.data).toEqual([]);
      });
    });

    describe("when API returns 4xx/5xx response", () => {
      it("should throw error", async () => {
        // ARRANGE
        server.use(
          http.get("*/kb/tags/", () => {
            return new HttpResponse(null, { status: 404 });
          })
        );

        // ACT & ASSERT
        await expect(tags.getAll()).rejects.toThrow();
      });
    });
  });
});
