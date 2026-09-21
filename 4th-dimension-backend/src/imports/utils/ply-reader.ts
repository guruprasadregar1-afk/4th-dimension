export interface PlyProperty {
  name: string;
  type: string;
}

export interface PlyHeader {
  format: 'ascii' | 'binary_little_endian' | 'binary_big_endian';
  vertexCount: number;
  properties: PlyProperty[];
  headerByteLength: number;
}

const TYPE_SIZES: Record<string, number> = {
  char: 1,
  uchar: 1,
  short: 2,
  ushort: 2,
  int: 4,
  uint: 4,
  float: 4,
  double: 8,
};

function parseHeader(text: string): PlyHeader {
  const lines = text.split(/\r?\n/);
  let format: PlyHeader['format'] = 'ascii';
  let vertexCount = 0;
  const properties: PlyProperty[] = [];
  let inVertex = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('format ')) {
      const parts = trimmed.split(/\s+/);
      format = parts[1] as PlyHeader['format'];
    } else if (trimmed.startsWith('element vertex ')) {
      vertexCount = parseInt(trimmed.split(/\s+/)[2], 10);
      inVertex = true;
    } else if (trimmed.startsWith('element ')) {
      inVertex = false;
    } else if (inVertex && trimmed.startsWith('property ')) {
      const parts = trimmed.split(/\s+/);
      if (parts[1] === 'list') {
        throw new Error('PLY list properties are not supported');
      }
      properties.push({ type: parts[1], name: parts[2] });
    } else if (trimmed === 'end_header') {
      break;
    }
  }

  const headerByteLength = text.indexOf('end_header') + 'end_header'.length + 1;

  return { format, vertexCount, properties, headerByteLength };
}

function readBinaryValue(
  buffer: Buffer,
  offset: number,
  type: string,
  littleEndian: boolean,
): number {
  switch (type) {
    case 'char':
      return buffer.readInt8(offset);
    case 'uchar':
      return buffer.readUInt8(offset);
    case 'short':
      return littleEndian
        ? buffer.readInt16LE(offset)
        : buffer.readInt16BE(offset);
    case 'ushort':
      return littleEndian
        ? buffer.readUInt16LE(offset)
        : buffer.readUInt16BE(offset);
    case 'int':
      return littleEndian
        ? buffer.readInt32LE(offset)
        : buffer.readInt32BE(offset);
    case 'uint':
      return littleEndian
        ? buffer.readUInt32LE(offset)
        : buffer.readUInt32BE(offset);
    case 'float':
      return littleEndian
        ? buffer.readFloatLE(offset)
        : buffer.readFloatBE(offset);
    case 'double':
      return littleEndian
        ? buffer.readDoubleLE(offset)
        : buffer.readDoubleBE(offset);
    default:
      throw new Error(`Unsupported PLY property type: ${type}`);
  }
}

export function parsePly(buffer: Buffer): {
  header: PlyHeader;
  rows: Record<string, number>[];
} {
  const headerEnd = buffer.indexOf('end_header');
  if (headerEnd === -1) {
    throw new Error('Invalid PLY: missing end_header');
  }

  const headerText = buffer.subarray(0, headerEnd + 'end_header'.length).toString('ascii');
  const header = parseHeader(headerText);
  const littleEndian = header.format !== 'binary_big_endian';
  const rows: Record<string, number>[] = [];

  if (header.format === 'ascii') {
    const body = buffer
      .subarray(header.headerByteLength)
      .toString('ascii')
      .trim()
      .split(/\r?\n/);

    for (let i = 0; i < header.vertexCount; i++) {
      const values = body[i]?.trim().split(/\s+/).map(Number) ?? [];
      const row: Record<string, number> = {};
      header.properties.forEach((prop, index) => {
        row[prop.name] = values[index] ?? 0;
      });
      rows.push(row);
    }

    return { header, rows };
  }

  let offset = header.headerByteLength;
  const vertexByteSize = header.properties.reduce(
    (sum, prop) => sum + (TYPE_SIZES[prop.type] ?? 0),
    0,
  );

  for (let i = 0; i < header.vertexCount; i++) {
    const row: Record<string, number> = {};
    for (const prop of header.properties) {
      row[prop.name] = readBinaryValue(buffer, offset, prop.type, littleEndian);
      offset += TYPE_SIZES[prop.type] ?? 0;
    }
    rows.push(row);

    if (i > 0 && i % 10000 === 0 && offset + vertexByteSize > buffer.length) {
      break;
    }
  }

  return { header, rows };
}

export function is3dgsPly(header: PlyHeader): boolean {
  const names = new Set(header.properties.map((p) => p.name));
  return (
    names.has('x') &&
    names.has('scale_0') &&
    names.has('rot_0') &&
    names.has('opacity')
  );
}
