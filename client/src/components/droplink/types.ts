export type Language = "ar" | "en";
export type FileCategory = "image" | "pdf" | "audio" | "video" | "document" | "archive" | "other";
export type SortOption = "newest" | "oldest" | "largest" | "smallest" | "name_asc" | "name_desc";

export type StoredFile = {
  id: string;
  name: string;
  category: FileCategory;
  contentType: string;
  sizeBytes: number;
  createdAt: string | Date;
  url: string;
  previewUrl?: string;
};

export type UploadConfig = {
  maxFileSizeBytes: number;
  deletionSupported: boolean;
  storageReady?: boolean;
  databaseReady?: boolean;
  storageDriver?: string;
  blockedExtensions?: string[];
};
