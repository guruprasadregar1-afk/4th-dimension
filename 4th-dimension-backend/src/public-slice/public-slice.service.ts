import { Injectable } from '@nestjs/common';
import {
  generateOrthoplex16Geometry,
  generateSimplex5Geometry,
  generateTesseractGeometry,
  slicePolytopeHyperplane,
  PolytopeGeometry4D,
} from '@4th-dimension/engine';
import * as engine from '@4th-dimension/engine';
import { SliceRequestDto } from './dto/slice-request.dto';
import { SliceResponseDto } from './dto/slice-response.dto';
import { generate24CellGeometry as generate24CellLocal } from './polytope-helpers';

@Injectable()
export class PublicSliceService {
  slicePolytope(dto: SliceRequestDto): SliceResponseDto {
    const startTime = performance.now();

    let polytopeGeom: PolytopeGeometry4D;
    switch (dto.polytope) {
      case 'tesseract':
        polytopeGeom = generateTesseractGeometry();
        break;
      case 'simplex5':
        polytopeGeom = generateSimplex5Geometry();
        break;
      case 'orthoplex16':
        polytopeGeom = generateOrthoplex16Geometry();
        break;
      case 'cell24':
        polytopeGeom =
          typeof (engine as Record<string, unknown>).generate24CellGeometry === 'function'
            ? ((engine as Record<string, unknown>).generate24CellGeometry as () => PolytopeGeometry4D)()
            : generate24CellLocal();
        break;
      default:
        polytopeGeom = generateTesseractGeometry();
    }

    const mesh = slicePolytopeHyperplane(polytopeGeom, dto.hyperplane);
    const computeTimeMs = Number((performance.now() - startTime).toFixed(3));

    return {
      polytope: dto.polytope,
      vertexCount: mesh.vertexCount,
      faceCount: mesh.faceCount,
      vertices3D: mesh.vertices3D,
      shapeClassification: mesh.shapeName,
      convex: mesh.isConvex,
      coplanar: mesh.isCoplanarFaces,
      watertight: mesh.isClosed,
      computeTimeMs,
    };
  }
}
