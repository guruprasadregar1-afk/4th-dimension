import { BadRequestException, Injectable } from '@nestjs/common';
import { ImportFileFormat } from '../schemas/import-job.schema';
import { FourDKeyframesJsonParser } from './four-d-keyframes-json.parser';
import { ImportParser } from './import-parser.interface';
import { NativeJsonParser } from './native-json.parser';
import { SplatParser } from './splat.parser';
import { ThreeDgsPlyParser } from './three-dgs-ply.parser';

@Injectable()
export class ParserRegistry {
  private readonly parsers: ImportParser[];

  constructor(
    nativeJsonParser: NativeJsonParser,
    fourDKeyframesJsonParser: FourDKeyframesJsonParser,
    threeDgsPlyParser: ThreeDgsPlyParser,
    splatParser: SplatParser,
  ) {
    this.parsers = [
      fourDKeyframesJsonParser,
      nativeJsonParser,
      threeDgsPlyParser,
      splatParser,
    ];
  }

  detect(fileName: string, buffer: Buffer): ImportParser {
    for (const parser of this.parsers) {
      if (parser.canParse(fileName, buffer)) {
        return parser;
      }
    }

    throw new BadRequestException(
      'Unsupported file format. Supported: native JSON (.json), 4D keyframes JSON, 3DGS PLY (.ply), SPLAT (.splat)',
    );
  }

  getByFormat(format: ImportFileFormat): ImportParser | undefined {
    return this.parsers.find((parser) => parser.format === format);
  }
}
