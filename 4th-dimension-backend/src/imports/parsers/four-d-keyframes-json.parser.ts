import { BadRequestException, Injectable } from '@nestjs/common';
import { GaussianPrimitive } from '../../scenes/schemas/gaussian-primitive.schema';
import { ImportFileFormat } from '../schemas/import-job.schema';
import { convert3dgsTo4dPrimitive } from '../utils/gaussian-conversions';
import {
  ImportParseOptions,
  ImportParser,
  ParsedImportResult,
} from './import-parser.interface';

interface Keyframe {
  time: number;
  gaussians: Array<Record<string, number>>;
}

@Injectable()
export class FourDKeyframesJsonParser implements ImportParser {
  readonly format = ImportFileFormat.FOUR_D_KEYFRAMES_JSON;

  canParse(fileName: string, buffer: Buffer): boolean {
    if (!fileName.toLowerCase().endsWith('.json')) {
      return false;
    }

    try {
      const parsed = JSON.parse(buffer.toString('utf-8'));
      return (
        parsed?.format === '4d-gaussians-keyframes' &&
        Array.isArray(parsed.frames)
      );
    } catch {
      return false;
    }
  }

  async parse(
    buffer: Buffer,
    options: ImportParseOptions = {},
  ): Promise<ParsedImportResult> {
    const parsed = JSON.parse(buffer.toString('utf-8')) as {
      title?: string;
      description?: string;
      tags?: string[];
      duration?: number;
      frames: Keyframe[];
    };

    const max = options.maxPrimitives ?? 500_000;
    const temporalVar = options.defaultTemporalVariance ?? 0.1;
    const primitives: GaussianPrimitive[] = [];
    const totalFrames = parsed.frames.length;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const frame = parsed.frames[frameIndex];
      if (!Array.isArray(frame.gaussians)) {
        throw new BadRequestException(`Frame ${frameIndex} missing gaussians array`);
      }

      for (const g of frame.gaussians) {
        primitives.push(
          convert3dgsTo4dPrimitive(
            {
              x: g.x ?? 0,
              y: g.y ?? 0,
              z: g.z ?? 0,
              opacity: g.opacity ?? 0,
              scale0: g.scale_0 ?? g.scale0 ?? -3,
              scale1: g.scale_1 ?? g.scale1 ?? -3,
              scale2: g.scale_2 ?? g.scale2 ?? -3,
              rot0: g.rot_0 ?? g.rot0 ?? 1,
              rot1: g.rot_1 ?? g.rot1 ?? 0,
              rot2: g.rot_2 ?? g.rot2 ?? 0,
              rot3: g.rot_3 ?? g.rot3 ?? 0,
              fDc0: g.f_dc_0 ?? g.fDc0 ?? 0,
              fDc1: g.f_dc_1 ?? g.fDc1 ?? 0,
              fDc2: g.f_dc_2 ?? g.fDc2 ?? 0,
              time: frame.time,
            },
            temporalVar,
          ),
        );

        if (primitives.length > max) {
          throw new BadRequestException(
            `Primitive count exceeds limit of ${max}`,
          );
        }
      }

      const progress = Math.round(((frameIndex + 1) / totalFrames) * 100);
      await options.onProgress?.(
        progress,
        `Parsed keyframe ${frameIndex + 1}/${totalFrames}`,
      );
    }

    const isTimeVarying = totalFrames > 1;
    return {
      title: parsed.title,
      description: parsed.description,
      tags: parsed.tags,
      duration: isTimeVarying ? (parsed.duration ?? options.defaultDuration ?? 5.0) : 0.0,
      primitives,
      metadata: {
        sourceFormat: '4d-gaussians-keyframes',
        frameCount: totalFrames,
        isTimeVarying,
        timestepCount: totalFrames,
      },
    };
  }
}
