/**
 * Pure TypeScript Offline QR Code Generator
 * Generates exact standard QR Code matrix (boolean[][]) without external dependencies.
 * Compatible with Version 1 to 6 (sufficient for URLs and library identifier strings).
 */

// Galois Field GF(2^8) math for Reed-Solomon Error Correction
const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x >= 256) {
      x ^= 0x11d; // Primitive polynomial 285 (x^8 + x^4 + x^3 + x^2 + 1)
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gfMultiply(poly[j], GF_EXP[i]);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

function rsCalculateEC(data: number[], ecCount: number): number[] {
  const genPoly = rsGeneratorPoly(ecCount);
  const remainder = new Array(ecCount).fill(0);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        remainder[j] ^= gfMultiply(genPoly[j], factor);
      }
    }
  }
  return remainder;
}

// Table of QR Code capacities and EC parameters for Level M (Medium ~15% recovery)
interface VersionInfo {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytes: number;
  alignmentPositions: number[];
}

const VERSIONS: VersionInfo[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 16, ecBytes: 10, alignmentPositions: [] },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 28, ecBytes: 16, alignmentPositions: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 44, ecBytes: 26, alignmentPositions: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 64, ecBytes: 36, alignmentPositions: [6, 26] },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 86, ecBytes: 48, alignmentPositions: [6, 30] },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 108, ecBytes: 64, alignmentPositions: [6, 34] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);
  const textLen = rawBytes.length;

  // Find minimum version that fits the text
  let chosenVersion: VersionInfo | null = null;
  for (const v of VERSIONS) {
    // Byte mode requires: 4 bits mode + 8 bits length + (len * 8) bits data
    const bitsNeeded = 4 + 8 + textLen * 8;
    const bytesNeeded = Math.ceil(bitsNeeded / 8);
    if (bytesNeeded <= v.dataBytes) {
      chosenVersion = v;
      break;
    }
  }

  if (!chosenVersion) {
    // Default to largest supported version
    chosenVersion = VERSIONS[VERSIONS.length - 1];
  }

  const { size, dataBytes, ecBytes, alignmentPositions } = chosenVersion;

  // 1. Bitstream encoding
  const bitstream: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bitstream.push((val >> i) & 1);
    }
  }

  // Byte mode indicator: 0100
  pushBits(0b0100, 4);
  // Character count indicator (8 bits for versions 1-9)
  pushBits(textLen, 8);
  // Data bytes
  for (let i = 0; i < textLen; i++) {
    pushBits(rawBytes[i], 8);
  }
  // Terminator: up to 4 zeroes
  const maxDataBits = dataBytes * 8;
  const terminatorLen = Math.min(4, maxDataBits - bitstream.length);
  pushBits(0, terminatorLen);

  // Pad to whole byte
  while (bitstream.length % 8 !== 0) {
    bitstream.push(0);
  }

  // Convert to byte array
  const dataByteList: number[] = [];
  for (let i = 0; i < bitstream.length; i += 8) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitstream[i + b];
    }
    dataByteList.push(byteVal);
  }

  // Pad bytes alternating 0xEC and 0x11
  let padByte = 0xec;
  while (dataByteList.length < dataBytes) {
    dataByteList.push(padByte);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  // 2. Calculate Reed-Solomon Error Correction
  const ecByteList = rsCalculateEC(dataByteList, ecBytes);
  const finalCodewords = dataByteList.concat(ecByteList);

  // 3. Construct Matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  function setModule(r: number, c: number, val: boolean) {
    matrix[r][c] = val;
    isFunction[r][c] = true;
  }

  // Draw 7x7 Finder Pattern with Separators
  function drawFinderPattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            setModule(nr, nc, isBorder || isCenter);
          } else {
            setModule(nr, nc, false); // Separator
          }
        }
      }
    }
  }

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns (for Version >= 2)
  if (alignmentPositions.length > 0) {
    for (const r of alignmentPositions) {
      for (const c of alignmentPositions) {
        if (!isFunction[r][c]) {
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
              const isCenter = dr === 0 && dc === 0;
              setModule(r + dr, c + dc, isBorder || isCenter);
            }
          }
        }
      }
    }
  }

  // Dark module
  setModule(size - 8, 8, true);

  // Reserve Format Information areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }

  // 4. Place Data Codewords (Zig-Zag pattern)
  let bitIndex = 0;
  const totalBits = finalCodewords.length * 8;

  let col = size - 1;
  let upwards = true;

  while (col > 0) {
    if (col === 6) col--; // Skip vertical timing column

    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [col, col - 1]) {
        if (!isFunction[r][c]) {
          let bit = false;
          if (bitIndex < totalBits) {
            const byteIdx = Math.floor(bitIndex / 8);
            const bitOffset = 7 - (bitIndex % 8);
            bit = ((finalCodewords[byteIdx] >> bitOffset) & 1) === 1;
            bitIndex++;
          }
          // Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = mask ? !bit : bit;
        }
      }
    }
    col -= 2;
    upwards = !upwards;
  }

  // 5. Write Format Information (EC Level M = 00, Mask 0 = 000 -> 0b00000 -> Format info with BCH: 0x5412 XOR)
  // Format bit string for EC: M (00), Mask: 0 (000) -> 101010000010010 (BCH code 0x5412 ^ 0x0000 = 0x5412)
  const FORMAT_BITS = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  // Top-left format bits
  setModule(8, 0, FORMAT_BITS[0] === 1);
  setModule(8, 1, FORMAT_BITS[1] === 1);
  setModule(8, 2, FORMAT_BITS[2] === 1);
  setModule(8, 3, FORMAT_BITS[3] === 1);
  setModule(8, 4, FORMAT_BITS[4] === 1);
  setModule(8, 5, FORMAT_BITS[5] === 1);
  setModule(8, 7, FORMAT_BITS[6] === 1);
  setModule(8, 8, FORMAT_BITS[7] === 1);
  setModule(7, 8, FORMAT_BITS[8] === 1);
  setModule(5, 8, FORMAT_BITS[9] === 1);
  setModule(4, 8, FORMAT_BITS[10] === 1);
  setModule(3, 8, FORMAT_BITS[11] === 1);
  setModule(2, 8, FORMAT_BITS[12] === 1);
  setModule(1, 8, FORMAT_BITS[13] === 1);
  setModule(0, 8, FORMAT_BITS[14] === 1);

  // Bottom-left / Top-right split format bits
  setModule(size - 1, 8, FORMAT_BITS[0] === 1);
  setModule(size - 2, 8, FORMAT_BITS[1] === 1);
  setModule(size - 3, 8, FORMAT_BITS[2] === 1);
  setModule(size - 4, 8, FORMAT_BITS[3] === 1);
  setModule(size - 5, 8, FORMAT_BITS[4] === 1);
  setModule(size - 6, 8, FORMAT_BITS[5] === 1);
  setModule(size - 7, 8, FORMAT_BITS[6] === 1);

  setModule(8, size - 8, FORMAT_BITS[7] === 1);
  setModule(8, size - 7, FORMAT_BITS[8] === 1);
  setModule(8, size - 6, FORMAT_BITS[9] === 1);
  setModule(8, size - 5, FORMAT_BITS[10] === 1);
  setModule(8, size - 4, FORMAT_BITS[11] === 1);
  setModule(8, size - 3, FORMAT_BITS[12] === 1);
  setModule(8, size - 2, FORMAT_BITS[13] === 1);
  setModule(8, size - 1, FORMAT_BITS[14] === 1);

  return matrix.map(row => row.map(cell => !!cell));
}
