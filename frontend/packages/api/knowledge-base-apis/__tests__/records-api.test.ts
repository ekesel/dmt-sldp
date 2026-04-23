import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { knowledgeRecords } from "../records-api";
import { createMockDocumentResponse } from "./factories";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("knowledgeRecords", () => {
  describe("search", () => {
    describe("when API succeeds", () => {
      it("should return mapped knowledge records", async () => {
        // ARRANGE
        const mockResponse = [createMockDocumentResponse({ id: 1, title: "Doc 1" })];
        server.use(
          http.get("*/kb/documents/", () => {
            return HttpResponse.json(mockResponse);
          })
        );

        // ACT
        const result = await knowledgeRecords.search();

        // ASSERT
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("1");
        expect(result[0].title).toBe("Doc 1");
      });
    });

    describe("when API succeeds with pagination results", () => {
      it("should handle paginated response", async () => {
        // ARRANGE
        const mockResponse = { results: [createMockDocumentResponse({ id: 2 })] };
        server.use(
          http.get("*/kb/documents/", () => {
            return HttpResponse.json(mockResponse);
          })
        );

        // ACT
        const result = await knowledgeRecords.search();

        // ASSERT
        expect(result[0].id).toBe("2");
      });
    });

    describe("when query params are provided", () => {
      it("should pass params to the API", async () => {
        // ARRANGE
        let capturedParams: any;
        server.use(
          http.get("*/kb/documents/", ({ request }) => {
            const url = new URL(request.url);
            capturedParams = Object.fromEntries(url.searchParams);
            return HttpResponse.json([]);
          })
        );

        // ACT
        await knowledgeRecords.search({ search: "test", category: 1, mine: true });

        // ASSERT
        expect(capturedParams.search).toBe("test");
        expect(capturedParams.category).toBe("1");
        expect(capturedParams.mine).toBe("true");
      });
    });
  });

  describe("getById", () => {
    describe("when API succeeds", () => {
      it("should return a mapped knowledge record", async () => {
        // ARRANGE
        const mockDoc = createMockDocumentResponse({ id: 10 });
        server.use(
          http.get("*/kb/documents/10/", () => {
            return HttpResponse.json(mockDoc);
          })
        );

        // ACT
        const result = await knowledgeRecords.getById(10);

        // ASSERT
        expect(result.id).toBe("10");
        expect(result.status).toBe("Approved");
      });
    });

    describe("when API returns data wrapper", () => {
      it("should handle response with data wrapper", async () => {
        // ARRANGE
        const mockDoc = createMockDocumentResponse({ id: 11 });
        server.use(
          http.get("*/kb/documents/11/", () => {
            return HttpResponse.json({ data: mockDoc });
          })
        );

        // ACT
        const result = await knowledgeRecords.getById(11);

        // ASSERT
        expect(result.id).toBe("11");
      });
    });
  });

  describe("create", () => {
    describe("when API succeeds", () => {
      it("should post formData and return mapped record", async () => {
        // ARRANGE
        const mockDoc = createMockDocumentResponse({ id: 100 });
        server.use(
          http.post("*/kb/documents/", () => {
            return HttpResponse.json(mockDoc);
          })
        );

        // ACT
        const formData = new FormData();
        formData.append("title", "New Doc");
        const result = await knowledgeRecords.create(formData);

        // ASSERT
        expect(result.id).toBe("100");
      });
    });
  });

  describe("updateStatus", () => {
    it("should call the status endpoint", async () => {
      // ARRANGE
      let capturedBody: any;
      server.use(
        http.post("*/kb/documents/1/status/", async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 200 });
        })
      );

      // ACT
      await knowledgeRecords.updateStatus(1, "APPROVED");

      // ASSERT
      expect(capturedBody.status).toBe("APPROVED");
    });
  });

  describe("deleteDocument", () => {
    it("should call the delete endpoint", async () => {
      // ARRANGE
      let called = false;
      server.use(
        http.delete("*/kb/documents/1/", () => {
          called = true;
          return new HttpResponse(null, { status: 204 });
        })
      );

      // ACT
      await knowledgeRecords.deleteDocument(1);

      // ASSERT
      expect(called).toBe(true);
    });
  });

  describe("update", () => {
    it("should patch document data", async () => {
      // ARRANGE
      const mockDoc = createMockDocumentResponse({ id: 1, title: "Updated" });
      server.use(
        http.patch("*/kb/documents/1/", () => {
          return HttpResponse.json(mockDoc);
        })
      );

      // ACT
      const result = await knowledgeRecords.update(1, { title: "Updated" });

      // ASSERT
      expect(result.title).toBe("Updated");
    });
  });
});
