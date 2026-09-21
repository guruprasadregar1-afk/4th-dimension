import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ImportJobStatus } from './schemas/import-job.schema';
import { ImportsService } from './imports.service';
import { ParserRegistry } from './parsers/parser.registry';
import { ScenesService } from '../scenes/scenes.service';
import { PrimitivesService } from '../scenes/primitives.service';

@Injectable()
export class ImportProcessorService {
  private readonly logger = new Logger(ImportProcessorService.name);
  private readonly queued = new Set<string>();

  constructor(
    @Inject(forwardRef(() => ImportsService))
    private readonly importsService: ImportsService,
    private readonly parserRegistry: ParserRegistry,
    private readonly scenesService: ScenesService,
    private readonly primitivesService: PrimitivesService,
  ) {}

  enqueue(jobId: string): void {
    if (this.queued.has(jobId)) {
      return;
    }

    this.queued.add(jobId);
    setImmediate(() => {
      void this.processJob(jobId).finally(() => this.queued.delete(jobId));
    });
  }

  private async processJob(jobId: string): Promise<void> {
    const job = await this.importsService.getJobDocument(jobId);

    try {
      await this.importsService.updateJobProgress(
        jobId,
        5,
        'Reading uploaded file',
        ImportJobStatus.PROCESSING,
      );

      const buffer = await this.importsService.getUploadBuffer(job);
      const parser = this.parserRegistry.getByFormat(job.detectedFormat);
      if (!parser) {
        throw new Error(`No parser registered for format ${job.detectedFormat}`);
      }

      const meta = job.metadata ?? {};
      const parsed = await parser.parse(buffer, {
        defaultDuration:
          typeof meta.duration === 'number' ? meta.duration : undefined,
        onProgress: async (progress, message) => {
          await this.importsService.updateJobProgress(jobId, progress, message);
        },
      });

      await this.importsService.updateJobProgress(
        jobId,
        95,
        'Creating scene and storing primitives',
      );

      const title =
        (typeof meta.title === 'string' && meta.title) ||
        parsed.title ||
        job.originalFileName.replace(/\.[^.]+$/, '');
      const description =
        (typeof meta.description === 'string' && meta.description) ||
        parsed.description ||
        `Imported from ${job.originalFileName}`;
      const tags = Array.isArray(meta.tags)
        ? (meta.tags as string[])
        : parsed.tags ?? ['imported'];

      const scene = await this.scenesService.create(job.ownerId.toString(), {
        title,
        description,
        tags,
        metadata: {
          ...(parsed.metadata ?? {}),
          importedFrom: job.originalFileName,
          importJobId: jobId,
          duration: parsed.duration ?? 0,
        },
      });

      await this.primitivesService.upload(scene.id, job.ownerId.toString(), {
        duration: parsed.duration,
        primitives: parsed.primitives,
      });

      await this.importsService.markJobComplete(
        jobId,
        scene.id,
        parsed.primitives.length,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown import error';
      this.logger.error(`Import job ${jobId} failed: ${message}`);
      await this.importsService.markJobFailed(jobId, message);
    }
  }
}
