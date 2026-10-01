import { inflateSync } from "node:zlib";

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
/** PNG RGBA8 transparente, sem animação; valida CRC e expansão antes do renderer. */
export function validarPngDaAssinatura(dataUrl: string): Buffer {
  const reject = (): never => {
    throw new Error("assinatura_png_invalida");
  };
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)) return reject();
  const png = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  if (
    png.length > 128 * 1024 ||
    png.length < 45 ||
    !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return reject();
  let width = 0,
    height = 0,
    offset = 8,
    ended = false,
    seenData = false;
  const idat: Buffer[] = [];
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    if (length > png.length - offset - 12) return reject();
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (
      crc32(png.subarray(offset + 4, offset + 8 + length)) !== png.readUInt32BE(offset + 8 + length)
    )
      return reject();
    if (offset === 8 && type !== "IHDR") return reject();
    if (type === "IHDR") {
      if (width || length !== 13) return reject();
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (
        !width ||
        !height ||
        width > 1024 ||
        height > 512 ||
        data[8] !== 8 ||
        data[9] !== 6 ||
        data[10] ||
        data[11] ||
        data[12]
      )
        return reject();
    } else if (type === "IDAT") {
      seenData = true;
      idat.push(data);
    } else if (type === "IEND") {
      if (length || !seenData) return reject();
      ended = true;
      offset += 12;
      break;
    } else if (type === "acTL" || type === "fcTL" || type === "fdAT" || /^[A-Z]/.test(type))
      return reject();
    offset += length + 12;
  }
  if (!ended || offset !== png.length) return reject();
  const stride = width * 4;
  const expected = (stride + 1) * height;
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat), { maxOutputLength: expected });
  } catch {
    return reject();
  }
  if (raw.length !== expected) return reject();
  let previous = Buffer.alloc(stride),
    transparent = false;
  for (let y = 0; y < height; y++) {
    const filter = raw.readUInt8(y * (stride + 1));
    if (filter > 4) return reject();
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? row.readUInt8(x - 4) : 0,
        b = previous.readUInt8(x),
        c = x >= 4 ? previous.readUInt8(x - 4) : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      if (filter === 2) predictor = b;
      if (filter === 3) predictor = Math.floor((a + b) / 2);
      if (filter === 4) {
        const p = a + b - c,
          pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c);
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[x] = (raw.readUInt8(y * (stride + 1) + 1 + x) + predictor) & 255;
      if (x % 4 === 3 && row.readUInt8(x) < 255) transparent = true;
    }
    previous = row;
  }
  if (!transparent) throw new Error("assinatura_png_sem_transparencia");
  return png;
}
