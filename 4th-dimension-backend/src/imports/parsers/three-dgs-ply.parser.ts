import { BadRequestException, Injectable } from '@nestjs/common';
import { ImportFileFormat } from '../schemas/import-job.schema';
import {
  convert3dgsTo4dPrimitive,
  normalizePrimitiveCoordinates,
} from '../utils/gaussian-conversions';
import { is3dgsPly, parsePly } from '../utils/ply-reader';
import {
  ImportParseOptions,
  ImportParser,
  ParsedImportResult,
} from './import-parser.interface';

@Injectable()
export class ThreeDgsPlyParser implements ImportParser {
  readonly format = ImportFileFormat.THREE_DGS_PLY;

  canParse(fileName: string, buffer: Buffer): boolean {
    if (!fileName.toLowerCase().endsWith('.ply')) {
      return false;
    }

    try {
      const { header } = parsePly(buffer);
      return is3dgsPly(header);
    } catch {
      return false;
    }
  }

  async parse(
    buffer: Buffer,
    options: ImportParseOptions = {},
  ): Promise<ParsedImportResult> {
    const { header, rows } = parsePly(buffer);

    if (!is3dgsPly(header)) {
      throw new BadRequestException(
        'PLY file is not a supported 3D Gaussian Splatting export',
      );
    }

    const max = options.maxPrimitives ?? 500_000;
    if (rows.length > max) {
      throw new BadRequestException(
        `PLY contains ${rows.length} gaussians; limit is ${max}`,
      );
    }

    const temporalVar = options.defaultTemporalVariance ?? 0.1;
    const chunkSize = Math.max(1, Math.floor(rows.length / 20));
    const primitives = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      primitives.push(
        convert3dgsTo4dPrimitive(
          {
            x: row.x ?? 0,
            y: row.y ?? 0,
            z: row.z ?? 0,
            opacity: row.opacity ?? 0,
            scale0: row.scale_0 ?? -3,
            scale1: row.scale_1 ?? -3,
            scale2: row.scale_2 ?? -3,
            rot0: row.rot_0 ?? 1,
            rot1: row.rot_1 ?? 0,
            rot2: row.rot_2 ?? 0,
            rot3: row.rot_3 ?? 0,
            fDc0: row.f_dc_0 ?? 0,
            fDc1: row.f_dc_1 ?? 0,
            fDc2: row.f_dc_2 ?? 0,
            time: row.t ?? row.time ?? 0,
          },
          temporalVar,
        ),
      );

      if (i > 0 && i % chunkSize === 0) {
        const progress = Math.min(99, Math.round((i / rows.length) * 100));
        await options.onProgress?.(progress, `Parsed ${i}/${rows.length} gaussians`);
      }
    }

    normalizePrimitiveCoordinates(primitives);
    await options.onProgress?.(100, `Parsed ${rows.length} gaussians from PLY`);

    return {
      title: undefined,
      duration: 0.0,
      primitives,
      metadata: {
        sourceFormat: '3dgs-ply',
        vertexCount: rows.length,
        plyFormat: header.format,
        isTimeVarying: false,
        timestepCount: 1,
      },
    };
  }
}
