import { Test, TestingModule } from '@nestjs/testing';
import { PublicSliceController } from './public-slice.controller';
import { PublicSliceService } from './public-slice.service';
import { SliceRequestDto } from './dto/slice-request.dto';

describe('PublicSliceController', () => {
  let controller: PublicSliceController;
  let service: PublicSliceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicSliceController],
      providers: [PublicSliceService],
    }).compile();

    controller = module.get<PublicSliceController>(PublicSliceController);
    service = module.get<PublicSliceService>(PublicSliceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('slice endpoint', () => {
    it('returns correct, validated results for tesseract at w=0.5 (axis slice)', () => {
      const dto: SliceRequestDto = {
        polytope: 'tesseract',
        hyperplane: {
          normal: [0, 0, 0, 1],
          offset: 0.5,
        },
      };

      const result = controller.slice(dto);

      expect(result.polytope).toBe('tesseract');
      expect(result.vertexCount).toBe(8);
      expect(result.faceCount).toBe(6);
      expect(result.shapeClassification).toBe('Cube');
      expect(result.convex).toBe(true);
      expect(result.coplanar).toBe(true);
      expect(result.watertight).toBe(true);
      expect(typeof result.computeTimeMs).toBe('number');
      expect(result.computeTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('returns correct, validated results for tesseract at offset=2.0 (diagonal slice - octahedron)', () => {
      const dto: SliceRequestDto = {
        polytope: 'tesseract',
        hyperplane: {
          normal: [1, 1, 1, 1],
          offset: 2.0,
        },
      };

      const result = controller.slice(dto);

      expect(result.polytope).toBe('tesseract');
      expect(result.vertexCount).toBe(4);
      expect(result.faceCount).toBe(4);
      expect(result.shapeClassification).toBe('Tetrahedron');
      expect(result.convex).toBe(true);
      expect(result.coplanar).toBe(true);
      expect(result.watertight).toBe(true);
    });

    it('returns valid results for 5-cell (simplex5)', () => {
      const dto: SliceRequestDto = {
        polytope: 'simplex5',
        hyperplane: {
          normal: [0, 0, 0, 1],
          offset: 0.0,
        },
      };

      const result = controller.slice(dto);

      expect(result.polytope).toBe('simplex5');
      expect(result.vertexCount).toBe(4);
      expect(result.shapeClassification).toBe('Tetrahedron');
      expect(result.convex).toBe(true);
    });

    it('returns valid results for 16-cell (orthoplex16)', () => {
      const dto: SliceRequestDto = {
        polytope: 'orthoplex16',
        hyperplane: {
          normal: [0, 0, 0, 1],
          offset: 0.0,
        },
      };

      const result = controller.slice(dto);

      expect(result.polytope).toBe('orthoplex16');
      expect(result.vertexCount).toBe(6);
      expect(result.shapeClassification).toBe('Octahedron');
      expect(result.convex).toBe(true);
    });

    it('returns valid results for 24-cell (cell24)', () => {
      const dto: SliceRequestDto = {
        polytope: 'cell24',
        hyperplane: {
          normal: [0, 0, 0, 1],
          offset: 0.0,
        },
      };

      const result = controller.slice(dto);

      expect(result.polytope).toBe('cell24');
      expect(result.vertexCount).toBe(14);
      expect(result.convex).toBe(true);
    });

    it('handles out-of-bounds slice returning empty mesh without crashing', () => {
      const dto: SliceRequestDto = {
        polytope: 'tesseract',
        hyperplane: {
          normal: [0, 0, 0, 1],
          offset: 10.0,
        },
      };

      const result = controller.slice(dto);

      expect(result.polytope).toBe('tesseract');
      expect(result.vertexCount).toBe(0);
      expect(result.faceCount).toBe(0);
      expect(result.shapeClassification).toBe('Empty (No Intersection)');
    });
  });
});
