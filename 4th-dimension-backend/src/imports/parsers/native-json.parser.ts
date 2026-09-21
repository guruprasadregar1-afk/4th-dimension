import { BadRequestException, Injectable } from '@nestjs/common';
import { GaussianPrimitive } from '../../scenes/schemas/gaussian-primitive.schema';
import {
  ImportFileFormat,
} from '../schemas/import-job.schema';
import {
  ImportParseOptions,
  ImportParser,
  ParsedImportResult,
} from './import-parser.interface';

function validatePrimitive(raw: unknown, index: number): GaussianPrimitive {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException(`Primitive ${index} must be an object`);
  }

  const p = raw as Record<string, unknown>;
  const mean = p.mean;
  const covariance = p.covariance;
  const color = p.color;
  const alpha = p.alpha;

  if (!Array.isArray(mean) || mean.length !== 4) {
    throw new BadRequestException(`Primitive ${index}: mean must have 4 elements`);
  }
  if (!Array.isArray(covariance) || covariance.length !== 16) {
    throw new BadRequestException(
      `Primitive ${index}: covariance must have 16 elements`,
    );
  }
  if (!Array.isArray(color) || color.length !== 4) {
    throw new BadRequestException(`Primitive ${index}: color must have 4 elements`);
  }
  if (typeof alpha !== 'number') {
    throw new BadRequestException(`Primitive ${index}: alpha must be a number`);
  }

  return {
    mean: mean.map(Number),
    covariance: covariance.map(Number),
    color: color.map(Number),
    alpha: Number(alpha),
  };
}

@Injectable()
export class NativeJsonParser implements ImportParser {
  readonly format = ImportFileFormat.NATIVE_JSON;

  canParse(fileName: string, buffer: Buffer): boolean {
    if (!fileName.toLowerCase().endsWith('.json')) {
      return false;
    }

    try {
      const parsed = JSON.parse(buffer.toString('utf-8'));
      return Array.isArray(parsed?.primitives);
    } catch {
      return false;
    }
  }

  async parse(
    buffer: Buffer,
    options: ImportParseOptions = {},
  ): Promise<ParsedImportResult> {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(buffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Invalid JSON file');
    }

    const rawPrimitives = parsed.primitives;
    if (!Array.isArray(rawPrimitives) || rawPrimitives.length === 0) {
      throw new BadRequestException('JSON must contain a non-empty primitives array');
    }

    const max = options.maxPrimitives ?? 500_000;
    if (rawPrimitives.length > max) {
      throw new BadRequestException(
        `Primitive count ${rawPrimitives.length} exceeds limit of ${max}`,
      );
    }

    const primitives = rawPrimitives.map((item, index) =>
      validatePrimitive(item, index),
    );

    await options.onProgress?.(100, 'Parsed native JSON');

    const uniqueTimesteps = new Set(primitives.map((p) => p.mean[3])).size;
    const isTimeVarying = uniqueTimesteps > 1;

    return {
      title: typeof parsed.title === 'string' ? parsed.title : undefined,
      description:
        typeof parsed.description === 'string' ? parsed.description : undefined,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t): t is string => typeof t === 'string')
        : undefined,
      duration: isTimeVarying
        ? typeof parsed.duration === 'number'
          ? parsed.duration
          : (options.defaultDuration ?? 5.0)
        : 0.0,
      primitives,
      metadata: {
        ...(parsed.metadata && typeof parsed.metadata === 'object'
          ? (parsed.metadata as Record<string, unknown>)
          : {}),
        sourceFormat: 'native-json',
        isTimeVarying,
        timestepCount: uniqueTimesteps,
      },
    };
  }
}
