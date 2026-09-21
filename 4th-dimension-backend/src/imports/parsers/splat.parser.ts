import { BadRequestException, Injectable } from '@nestjs/common';
import { GaussianPrimitive } from '../../scenes/schemas/gaussian-primitive.schema';
import { ImportFileFormat } from '../schemas/import-job.schema';
import {
  buildCovariance3D,
  embedCovariance4D,
  normalizePrimitiveCoordinates,
  splatU8ToQuaternion,
} from '../utils/gaussian-conversions';
import {
  ImportParseOptions,
  ImportParser,
  ParsedImportResult,
} from './import-parser.interface';

const SPLAT_RECORD_SIZE = 32;

@Injectable()
export class SplatParser implements ImportParser {
  readonly format = ImportFileFormat.SPLAT;

  canParse(fileName: string, buffer: Buffer): boolean {
    return (
      fileName.toLowerCase().endsWith('.splat') &&
      buffer.length >= SPLAT_RECORD_SIZE &&
      buffer.length % SPLAT_RECORD_SIZE === 0
    );
  }

  async parse(
    buffer: Buffer,
    options: ImportParseOptions = {},
  ): Promise<ParsedImportResult> {
    const count = Math.floor(buffer.length / SPLAT_RECORD_SIZE);
    const max = options.maxPrimitives ?? 500_000;

    if (count > max) {
      throw new BadRequestException(
        `SPLAT contains ${count} gaussians; limit is ${max}`,
      );
    }

    const temporalVar = options.defaultTemporalVariance ?? 0.1;
    const primitives: GaussianPrimitive[] = [];
    const chunkSize = Math.max(1, Math.floor(count / 20));

    for (let i = 0; i < count; i++) {
      const offset = i * SPLAT_RECORD_SIZE;
      const x = buffer.readFloatLE(offset);
      const y = buffer.readFloatLE(offset + 4);
      const z = buffer.readFloatLE(offset + 8);
      const scale0 = buffer.readFloatLE(offset + 12);
      const scale1 = buffer.readFloatLE(offset + 16);
      const scale2 = buffer.readFloatLE(offset + 20);
      const r = buffer.readUInt8(offset + 24) / 255;
      const g = buffer.readUInt8(offset + 25) / 255;
      const b = buffer.readUInt8(offset + 26) / 255;
      const alpha = buffer.readUInt8(offset + 27) / 255;
      const rot = splatU8ToQuaternion(
        buffer.readUInt8(offset + 28),
        buffer.readUInt8(offset + 29),
        buffer.readUInt8(offset + 30),
        buffer.readUInt8(offset + 31),
      );

      const cov3 = buildCovariance3D(rot, [scale0, scale1, scale2]);

      primitives.push({
        mean: [x, y, z, 0],
        covariance: embedCovariance4D(cov3, temporalVar),
        color: [r, g, b, 1],
        alpha,
      });

      if (i > 0 && i % chunkSize === 0) {
        const progress = Math.min(99, Math.round((i / count) * 100));
        await options.onProgress?.(progress, `Parsed ${i}/${count} splats`);
      }
    }

    normalizePrimitiveCoordinates(primitives);
    await options.onProgress?.(100, `Parsed ${count} splats`);

    return {
      duration: 0.0,
      primitives,
      metadata: {
        sourceFormat: 'splat',
        recordCount: count,
        isTimeVarying: false,
        timestepCount: 1,
      },
    };
  }
}
