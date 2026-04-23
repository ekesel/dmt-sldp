import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { metadata } from "../metadata-api";
import { createMockMetadataCategory, createMockMetadataValue } from "./factories";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("metadata-api", () => {
  describe("getCategories", () => {
    describe("when API succeeds with flat array", () => {
      it("should return mapped data", async () => {
        // ARRANGE
        const mockCategories = [createMockMetadataCategory()];
        server.use(
          http.get("*/kb/metadata/categories/", () => {
            return HttpResponse.json(mockCategories);
          })
        );

        // ACT
        const result = await metadata.getCategories();

        // ASSERT
        expect(result).toEqual(mockCategories);
      });
    });

    describe("when API succeeds with paginated results", () => {
      it("should handle response with results wrapper", async () => {
        // ARRANGE
        const mockCategories = [createMockMetadataCategory()];
        server.use(
          http.get("*/kb/metadata/categories/", () => {
            return HttpResponse.json({ results: mockCategories });
          })
        );

        // ACT
        const result = await metadata.getCategories();

        // ASSERT
        expect(result).toEqual(mockCategories);
      });
    });

    describe("when API returns 4xx/5xx response", () => {
      it("should throw error", async () => {
        // ARRANGE
        server.use(
          http.get("*/kb/metadata/categories/", () => {
            return new HttpResponse(null, { status: 500 });
          })
        );

        // ACT & ASSERT
        await expect(metadata.getCategories()).rejects.toThrow();
      });
    });
  });

  describe("listValues", () => {
    describe("when API succeeds", () => {
      it("should return values for a category", async () => {
        // ARRANGE
        const mockValues = [createMockMetadataValue({ category: 1 })];
        server.use(
          http.get("*/kb/metadata/values/", ({ request }) => {
            const url = new URL(request.url);
            const category = url.searchParams.get("category");
            if (category === "1") {
              return HttpResponse.json(mockValues);
            }
            return HttpResponse.json([]);
          })
        );

        // ACT
        const result = await metadata.listValues(1);

        // ASSERT
        expect(result).toEqual(mockValues);
      });
    });

    describe("when category is null or undefined", () => {
      it("should handle request without category param", async () => {
        // ARRANGE
        const mockValues = [createMockMetadataValue()];
        server.use(
          http.get("*/kb/metadata/values/", () => {
            return HttpResponse.json(mockValues);
          })
        );

        // ACT
        const result = await metadata.listValues();

        // ASSERT
        expect(result).toEqual(mockValues);
      });
    });
  });

  describe("createCategory", () => {
    describe("when API succeeds", () => {
      it("should return the created category", async () => {
        // ARRANGE
        const newCategory = createMockMetadataCategory({ name: "New Cat" });
        server.use(
          http.post("*/kb/metadata/categories/", () => {
            return HttpResponse.json(newCategory);
          })
        );

        // ACT
        const result = await metadata.createCategory({ name: "New Cat" });

        // ASSERT
        expect(result).toEqual(newCategory);
      });
    });
  });

  describe("addValue", () => {
    describe("when API succeeds", () => {
      it("should return the added value", async () => {
        // ARRANGE
        const newValue = createMockMetadataValue({ category: 1, value: "New Val" });
        server.use(
          http.post("*/kb/metadata/values/", () => {
            return HttpResponse.json(newValue);
          })
        );

        // ACT
        const result = await metadata.addValue({ category: 1, value: "New Val" });

        // ASSERT
        expect(result).toEqual(newValue);
      });
    });
  });
});
