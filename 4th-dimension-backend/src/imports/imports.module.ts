import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScenesModule } from '../scenes/scenes.module';
import { FourDKeyframesJsonParser } from './parsers/four-d-keyframes-json.parser';
import { NativeJsonParser } from './parsers/native-json.parser';
import { ParserRegistry } from './parsers/parser.registry';
import { SplatParser } from './parsers/splat.parser';
import { ThreeDgsPlyParser } from './parsers/three-dgs-ply.parser';
import { ImportProcessorService } from './import-processor.service';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportJob, ImportJobSchema } from './schemas/import-job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportJob.name, schema: ImportJobSchema },
    ]),
    ScenesModule,
  ],
  controllers: [ImportsController],
  providers: [
    ImportsService,
    ImportProcessorService,
    ParserRegistry,
    NativeJsonParser,
    FourDKeyframesJsonParser,
    ThreeDgsPlyParser,
    SplatParser,
  ],
  exports: [ImportsService],
})
export class ImportsModule {}
