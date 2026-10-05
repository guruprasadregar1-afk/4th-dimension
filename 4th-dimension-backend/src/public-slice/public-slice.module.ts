import { Module } from '@nestjs/common';
import { PublicSliceController } from './public-slice.controller';
import { PublicSliceService } from './public-slice.service';

@Module({
  controllers: [PublicSliceController],
  providers: [PublicSliceService],
  exports: [PublicSliceService],
})
export class PublicSliceModule {}
