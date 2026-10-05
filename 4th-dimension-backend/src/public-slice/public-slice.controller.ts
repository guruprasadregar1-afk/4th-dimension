import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { SliceRequestDto } from './dto/slice-request.dto';
import { SliceResponseDto } from './dto/slice-response.dto';
import { PublicSliceService } from './public-slice.service';

@ApiTags('public')
@Controller('api/public')
export class PublicSliceController {
  constructor(private readonly publicSliceService: PublicSliceService) {}

  @Post('slice')
  @HttpCode(HttpStatus.OK)
  @Public()
  @Throttle({ public: { ttl: 60000, limit: 20 } })
  @ApiOperation({
    summary: 'Slice a 4D polytope with a 3D hyperplane (Unauthenticated)',
    description:
      'Exposes the validated 4D hyperplane-slicing engine for external research notebooks and browser clients with zero authentication setup.',
  })
  @ApiResponse({
    status: 200,
    description: 'Polytope cross-section computed successfully',
    type: SliceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (bad polytope name or malformed hyperplane)',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (max 20 requests per minute per IP)',
  })
  slice(@Body() dto: SliceRequestDto): SliceResponseDto {
    return this.publicSliceService.slicePolytope(dto);
  }
}
