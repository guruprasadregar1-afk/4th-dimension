import { ApiProperty } from '@nestjs/swagger';

export class SliceResponseDto {
  @ApiProperty({ example: 'tesseract', description: 'Requested 4D polytope identifier' })
  polytope!: string;

  @ApiProperty({ example: 4, description: 'Number of 3D intersection vertices' })
  vertexCount!: number;

  @ApiProperty({ example: 4, description: 'Number of 3D cross-sectional polygonal faces' })
  faceCount!: number;

  @ApiProperty({
    example: [
      [0.5, 0.5, 0.5],
      [-0.5, 0.5, 0.5],
      [0.5, -0.5, 0.5],
      [0.5, 0.5, -0.5],
    ],
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'number' },
    },
    description: '3D canonical projected coordinates of cross-section vertices',
  })
  vertices3D!: number[][];

  @ApiProperty({ example: 'Tetrahedron', description: 'Analytical 3D shape classification' })
  shapeClassification!: string;

  @ApiProperty({ example: true, description: 'Whether the resulting 3D cross-section mesh is convex' })
  convex!: boolean;

  @ApiProperty({ example: true, description: 'Whether all 3D mesh faces are planar' })
  coplanar!: boolean;

  @ApiProperty({ example: true, description: 'Whether the mesh forms a closed watertight polyhedron' })
  watertight!: boolean;

  @ApiProperty({ example: 2.3, description: 'Execution duration of hyperplane-slicing calculation in milliseconds' })
  computeTimeMs!: number;
}
