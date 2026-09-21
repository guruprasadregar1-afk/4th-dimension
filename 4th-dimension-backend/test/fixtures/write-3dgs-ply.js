/**
 * Write a binary INRIA 3DGS PLY file.
 * @param {Array<{x,y,z,opacity,scale:number[],rot:number[],color:number[]}>} gaussians
 * @param {string} outPath
 */
function write3dgsPly(gaussians, outPath) {
  const fs = require('fs');

  const header = `ply
format binary_little_endian 1.0
element vertex ${gaussians.length}
property float x
property float y
property float z
property float nx
property float ny
property float nz
property float f_dc_0
property float f_dc_1
property float f_dc_2
property float opacity
property float scale_0
property float scale_1
property float scale_2
property float rot_0
property float rot_1
property float rot_2
property float rot_3
end_header
`;

  const body = Buffer.alloc(gaussians.length * 17 * 4);
  let offset = 0;

  for (const g of gaussians) {
    body.writeFloatLE(g.x, offset); offset += 4;
    body.writeFloatLE(g.y, offset); offset += 4;
    body.writeFloatLE(g.z, offset); offset += 4;
    body.writeFloatLE(0, offset); offset += 4;
    body.writeFloatLE(0, offset); offset += 4;
    body.writeFloatLE(0, offset); offset += 4;
    body.writeFloatLE(g.color[0], offset); offset += 4;
    body.writeFloatLE(g.color[1], offset); offset += 4;
    body.writeFloatLE(g.color[2], offset); offset += 4;
    body.writeFloatLE(g.opacity, offset); offset += 4;
    body.writeFloatLE(g.scale[0], offset); offset += 4;
    body.writeFloatLE(g.scale[1], offset); offset += 4;
    body.writeFloatLE(g.scale[2], offset); offset += 4;
    body.writeFloatLE(g.rot[0], offset); offset += 4;
    body.writeFloatLE(g.rot[1], offset); offset += 4;
    body.writeFloatLE(g.rot[2], offset); offset += 4;
    body.writeFloatLE(g.rot[3], offset); offset += 4;
  }

  fs.writeFileSync(outPath, Buffer.concat([Buffer.from(header, 'ascii'), body]));
  return gaussians.length;
}

module.exports = { write3dgsPly };
