import { Tag } from "../tags-api";
import { MetadataCategory, MetadataValue } from "../metadata-api";
import { KnowledgeManager } from "../users-api";

export const createMockTag = (overrides?: Partial<Tag>): Tag => ({
  id: 1,
  name: "Mock Tag",
  ...overrides,
});

export const createMockMetadataCategory = (overrides?: Partial<MetadataCategory>): MetadataCategory => ({
  id: 1,
  name: "Mock Category",
  ...overrides,
});

export const createMockMetadataValue = (overrides?: Partial<MetadataValue>): MetadataValue => ({
  id: 10,
  category: 1,
  category_name: "Mock Category",
  value: "Mock Value",
  ...overrides,
});

export const createMockKnowledgeManager = (overrides?: Partial<KnowledgeManager>): KnowledgeManager => ({
  id: 1,
  username: "mock_user",
  ...overrides,
});

export const createMockDocumentResponse = (overrides?: any): any => ({
  id: 1,
  title: "Mock Document",
  description: "Mock Description",
  status: "APPROVED",
  created_by: 1,
  owner: 1,
  created_at: "2023-01-01T10:00:00Z",
  uid: "KB-1",
  version: "v1.0",
  version_count: 1,
  tags: [1],
  tag_details: [{ id: 1, name: "tag1" }],
  metadata: [{ id: 10, category: "Mock Category", value: "Mock Value", category_id: 1 }],
  file_details: [{ id: 1, name: "file.pdf", size_bytes: 1024, file: "/media/file.pdf" }],
  latest_version: { file: "/media/file.pdf", version_number: 1 },
  ...overrides,
});
