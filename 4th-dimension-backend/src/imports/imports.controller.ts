import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { CreateImportDto } from './dto/create-import.dto';
import { ImportsService } from './imports.service';

@ApiTags('imports')
@ApiBearerAuth()
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Throttle({ default: {} })
  @Post()
  @ApiOperation({ summary: 'Upload a Gaussian model file for import' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        tags: { type: 'string', description: 'Comma-separated tags' },
        duration: { type: 'number' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  create(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImportDto,
  ) {
    return this.importsService.createImport(user.userId, file, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List import jobs for the current user' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.importsService.findAllByOwner(
      user.userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get import job status and progress' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.importsService.findByIdForOwner(id, user.userId);
  }
}
