export type ImportJobStatus = 'pending' | 'processing' | 'complete' | 'failed';

export type ImportFileFormat =
  | 'native-json'
  | '3dgs-ply'
  | 'splat'
  | '4d-keyframes-json';

export interface ImportJobMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  duration?: number;
}

export interface ImportJob {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  detectedFormat: ImportFileFormat;
  status: ImportJobStatus;
  progress: number;
  statusMessage: string;
  sceneId: string | null;
  primitiveCount: number;
  errorMessage: string | null;
  metadata: ImportJobMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ImportsResponse {
  items: ImportJob[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const ACCEPTED_IMPORT_EXTENSIONS = ['.json', '.ply', '.splat'] as const;

export const MAX_IMPORT_FILE_BYTES = 100 * 1024 * 1024;

export function formatImportFormat(format: ImportFileFormat): string {
  switch (format) {
    case 'native-json':
      return 'Native JSON';
    case '3dgs-ply':
      return '3DGS PLY';
    case 'splat':
      return 'SPLAT';
    case '4d-keyframes-json':
      return '4D Keyframes JSON';
    default:
      return format;
  }
}

export function isImportInProgress(status: ImportJobStatus): boolean {
  return status === 'pending' || status === 'processing';
}
