import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Connection, Model, Types } from 'mongoose';
import { CreateImportDto } from './dto/create-import.dto';
import { ImportProcessorService } from './import-processor.service';
import { ParserRegistry } from './parsers/parser.registry';
import {
  ImportJob,
  ImportJobDocument,
  ImportJobStatus,
} from './schemas/import-job.schema';

const GRIDFS_BUCKET = 'import_uploads';
const DEFAULT_MAX_FILE_BYTES = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.json', '.ply', '.splat']);

export interface UploadedImportFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class ImportsService {
  constructor(
    @InjectModel(ImportJob.name)
    private readonly importJobModel: Model<ImportJob>,
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
    private readonly parserRegistry: ParserRegistry,
    @Inject(forwardRef(() => ImportProcessorService))
    private readonly importProcessor: ImportProcessorService,
  ) {}

  async createImport(
    ownerId: string,
    file: UploadedImportFile,
    dto: CreateImportDto,
  ) {
    this.validateUpload(file);

    const parser = this.parserRegistry.detect(file.originalname, file.buffer);
    const gridFsFileId = await this.storeUpload(file);

    const job = await this.importJobModel.create({
      ownerId: new Types.ObjectId(ownerId),
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      detectedFormat: parser.format,
      status: ImportJobStatus.PENDING,
      progress: 0,
      statusMessage: 'Queued for processing',
      gridFsFileId,
      metadata: {
        title: dto.title,
        description: dto.description,
        tags: dto.tags ?? [],
        duration: dto.duration,
      },
    });

    this.importProcessor.enqueue(job.id);

    return this.toPublicJob(job);
  }

  async findByIdForOwner(jobId: string, ownerId: string) {
    const job = await this.findJobOrThrow(jobId);
    this.assertOwner(job, ownerId);
    return this.toPublicJob(job);
  }

  async findAllByOwner(ownerId: string, limit = 20, offset = 0) {
    const [jobs, total] = await Promise.all([
      this.importJobModel
        .find({ ownerId: new Types.ObjectId(ownerId) })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.importJobModel.countDocuments({
        ownerId: new Types.ObjectId(ownerId),
      }),
    ]);

    return {
      items: jobs.map((job) => this.toPublicJob(job)),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + jobs.length < total,
      },
    };
  }

  async getUploadBuffer(job: ImportJobDocument): Promise<Buffer> {
    if (!job.gridFsFileId) {
      throw new NotFoundException('Upload file not found for import job');
    }

    const bucket = this.getBucket();
    const chunks: Buffer[] = [];
    const downloadStream = bucket.openDownloadStream(
      new ObjectId(job.gridFsFileId.toString()),
    );

    await new Promise<void>((resolve, reject) => {
      downloadStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      downloadStream.on('error', reject);
      downloadStream.on('end', resolve);
    });

    return Buffer.concat(chunks);
  }

  async updateJobProgress(
    jobId: string,
    progress: number,
    statusMessage: string,
    status?: ImportJobStatus,
  ): Promise<void> {
    await this.importJobModel.findByIdAndUpdate(jobId, {
      progress,
      statusMessage,
      ...(status ? { status } : {}),
    });
  }

  async markJobComplete(
    jobId: string,
    sceneId: string,
    primitiveCount: number,
  ): Promise<void> {
    await this.importJobModel.findByIdAndUpdate(jobId, {
      status: ImportJobStatus.COMPLETE,
      progress: 100,
      statusMessage: 'Import complete',
      sceneId: new Types.ObjectId(sceneId),
      primitiveCount,
      errorMessage: '',
    });
  }

  async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    await this.importJobModel.findByIdAndUpdate(jobId, {
      status: ImportJobStatus.FAILED,
      statusMessage: 'Import failed',
      errorMessage,
    });
  }

  async getJobDocument(jobId: string): Promise<ImportJobDocument> {
    return this.findJobOrThrow(jobId);
  }

  private validateUpload(file: UploadedImportFile): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }

    const maxBytes = this.getMaxFileBytes();
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `File exceeds maximum size of ${maxBytes} bytes`,
      );
    }

    const extension = this.getExtension(file.originalname);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException(
        `Unsupported file extension "${extension}". Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
      );
    }
  }

  private async storeUpload(file: UploadedImportFile): Promise<Types.ObjectId> {
    const bucket = this.getBucket();
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve());
      uploadStream.end(file.buffer);
    });

    return new Types.ObjectId(uploadStream.id.toString());
  }

  private getBucket(): GridFSBucket {
    const db = this.connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not ready');
    }

    return new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
  }

  private getExtension(fileName: string): string {
    const index = fileName.lastIndexOf('.');
    return index === -1 ? '' : fileName.slice(index).toLowerCase();
  }

  private getMaxFileBytes(): number {
    const raw = this.config.get<string>('IMPORT_MAX_FILE_BYTES');
    return raw ? parseInt(raw, 10) : DEFAULT_MAX_FILE_BYTES;
  }

  private async findJobOrThrow(jobId: string): Promise<ImportJobDocument> {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new NotFoundException('Import job not found');
    }

    const job = await this.importJobModel.findById(jobId).exec();
    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    return job;
  }

  private assertOwner(job: ImportJobDocument, ownerId: string): void {
    if (job.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You do not have access to this import job');
    }
  }

  toPublicJob(job: ImportJobDocument) {
    return {
      id: job.id,
      originalFileName: job.originalFileName,
      mimeType: job.mimeType,
      fileSizeBytes: job.fileSizeBytes,
      detectedFormat: job.detectedFormat,
      status: job.status,
      progress: job.progress,
      statusMessage: job.statusMessage,
      sceneId: job.sceneId?.toString() ?? null,
      primitiveCount: job.primitiveCount,
      errorMessage: job.errorMessage || null,
      metadata: job.metadata,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
