import { GaussianPrimitive } from '../../scenes/schemas/gaussian-primitive.schema';
import { ImportFileFormat } from '../schemas/import-job.schema';

export interface ParsedImportResult {
  title?: string;
  description?: string;
  tags?: string[];
  duration?: number;
  primitives: GaussianPrimitive[];
  metadata?: Record<string, unknown>;
}

export interface ImportParseOptions {
  defaultDuration?: number;
  defaultTemporalVariance?: number;
  maxPrimitives?: number;
  onProgress?: (progress: number, message: string) => Promise<void>;
}

export interface ImportParser {
  readonly format: ImportFileFormat;
  canParse(fileName: string, buffer: Buffer): boolean;
  parse(buffer: Buffer, options?: ImportParseOptions): Promise<ParsedImportResult>;
}
