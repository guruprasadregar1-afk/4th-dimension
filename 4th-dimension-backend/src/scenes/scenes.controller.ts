import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CacheHeaderInterceptor } from '../cache/cache-header.interceptor';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { CloneSceneDto } from './dto/clone-scene.dto';
import { CreateSceneDto } from './dto/create-scene.dto';
import { QueryScenesDto } from './dto/query-scenes.dto';
import { SaveSnapshotDto } from './dto/save-snapshot.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { UploadPrimitivesDto } from './dto/upload-primitives.dto';
import { AppCacheService } from '../cache/app-cache.service';
import { PrimitivesService } from './primitives.service';
import { ScenesService } from './scenes.service';

@ApiTags('scenes')
@ApiBearerAuth()
@Controller('scenes')
export class ScenesController {
  constructor(
    private readonly scenesService: ScenesService,
    private readonly primitivesService: PrimitivesService,
    private readonly cache: AppCacheService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new 4D scene' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSceneDto) {
    return this.scenesService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List scenes with pagination, search, and filters (owner only)',
  })
  findAll(@CurrentUser() user: AuthUser, @Query() query: QueryScenesDto) {
    return this.scenesService.findAllByOwner(user.userId, query);
  }

  @Put(':id/primitives')
  @ApiOperation({ summary: 'Upload 4D Gaussian primitives for a scene' })
  uploadPrimitives(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UploadPrimitivesDto,
  ) {
    return this.primitivesService.upload(id, user.userId, dto);
  }

  @Get(':id/primitives')
  @UseInterceptors(CacheHeaderInterceptor)
  @ApiOperation({
    summary: 'Fetch scene primitives (embedded or GridFS — same response format)',
  })
  fetchPrimitives(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.primitivesService.fetch(id, user.userId);
  }

  @Get(':id/export')
  @ApiOperation({
    summary: 'Export scene as native JSON or glTF manifest (re-importable via POST /imports)',
  })
  async exportScene(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('format') format = 'json',
  ) {
    const scene = await this.scenesService.findByIdForOwner(id, user.userId);
    const payload = await this.primitivesService.fetch(id, user.userId);

    if (format === 'gltf_manifest') {
      return {
        asset: { version: '2.0', generator: '4D-Platform-Exporter' },
        scenes: [{ name: scene.title, nodes: [0] }],
        nodes: [{ name: '4D_Gaussian_Group', primitivesCount: payload.primitives.length }],
        extras: {
          format: '4d-gltf-manifest',
          duration: payload.duration,
          primitives: payload.primitives,
        },
      };
    }

    return {
      format: '4d-native',
      title: scene.title,
      description: scene.description,
      tags: scene.tags,
      duration: payload.duration,
      primitives: payload.primitives,
      exportedAt: new Date().toISOString(),
      sourceSceneId: scene.id,
    };
  }

  @Post(':id/snapshot')
  @ApiOperation({ summary: 'Save simulated 4D engine physical state snapshot (owner only)' })
  async saveSnapshot(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SaveSnapshotDto,
  ) {
    const scene = await this.scenesService.findByIdForOwner(id, user.userId);
    const snapshots = (scene.metadata?.snapshots as any[]) || [];
    snapshots.push({
      ...dto,
      savedAt: new Date().toISOString(),
    });

    return this.scenesService.update(id, user.userId, {
      metadata: {
        ...scene.metadata,
        snapshots,
      },
    });
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Duplicate a scene and its primitives (owner only)' })
  async cloneScene(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CloneSceneDto,
  ) {
    const source = await this.scenesService.findByIdForOwner(id, user.userId);
    const payload = await this.primitivesService.fetch(id, user.userId);

    const created = await this.scenesService.create(user.userId, {
      title: dto.title ?? `${source.title} (copy)`,
      description: source.description,
      tags: [...source.tags],
      metadata: { ...source.metadata },
    });

    await this.primitivesService.upload(created.id, user.userId, {
      primitives: payload.primitives,
      duration: payload.duration,
    });

    return this.scenesService.findByIdForOwner(created.id, user.userId);
  }

  @Get(':id')
  @UseInterceptors(CacheHeaderInterceptor)
  @ApiOperation({ summary: 'Get a scene by ID (owner only)' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.scenesService.findByIdForOwner(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scene (owner only)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSceneDto,
  ) {
    return this.scenesService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a scene (owner only)' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const scene = await this.scenesService.getOwnedSceneDocument(
      id,
      user.userId,
    );
    await this.primitivesService.deleteStorageForScene(scene);
    await scene.deleteOne();
    await this.cache.invalidateScene(user.userId, id);
    return { message: 'Scene deleted successfully' };
  }
}
