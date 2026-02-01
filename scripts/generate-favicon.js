/**
 * Favicon.ico 생성 스크립트
 *
 * Canvas를 사용하여 favicon.ico를 생성합니다.
 * ICO 파일에는 16x16, 32x32, 48x48 크기가 포함됩니다.
 *
 * 사용법: node scripts/generate-favicon.js
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// ICO 파일에 포함할 크기들
const sizes = [16, 32, 48];

/**
 * 아이콘 그리기 (generate-icons.js와 동일한 스타일)
 *
 * @param {number} size - 아이콘 크기 (픽셀)
 * @returns {Buffer} PNG 이미지 버퍼
 */
function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 배경 그라디언트 (파란색 계열)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3b82f6');  // blue-500
  gradient.addColorStop(1, '#1d4ed8');  // blue-700

  // 둥근 사각형 배경
  const radius = size * 0.2;  // 20% 라운드
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // "T" 문자 그리기 (Tickerbird의 T)
  const fontSize = size * 0.55;
  ctx.font = `bold ${fontSize}px "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T', size / 2, size / 2 + size * 0.02);

  return canvas.toBuffer('image/png');
}

/**
 * ICO 파일 생성
 *
 * ICO 형식:
 * - Header (6 bytes)
 * - Directory entries (16 bytes each)
 * - Image data (PNG format)
 */
function createIco(pngBuffers) {
  const numImages = pngBuffers.length;

  // ICO Header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved (0)
  header.writeUInt16LE(1, 2);     // Image type: 1 = ICO
  header.writeUInt16LE(numImages, 4);  // Number of images

  // Calculate offsets
  const directorySize = 16 * numImages;
  const headerSize = 6;
  let currentOffset = headerSize + directorySize;

  // Directory entries
  const directories = [];
  const sizes = [16, 32, 48];

  for (let i = 0; i < numImages; i++) {
    const dir = Buffer.alloc(16);
    const size = sizes[i];
    const pngBuffer = pngBuffers[i];

    dir.writeUInt8(size === 256 ? 0 : size, 0);  // Width (0 means 256)
    dir.writeUInt8(size === 256 ? 0 : size, 1);  // Height (0 means 256)
    dir.writeUInt8(0, 2);          // Color palette (0 = no palette)
    dir.writeUInt8(0, 3);          // Reserved
    dir.writeUInt16LE(1, 4);       // Color planes
    dir.writeUInt16LE(32, 6);      // Bits per pixel
    dir.writeUInt32LE(pngBuffer.length, 8);   // Image size
    dir.writeUInt32LE(currentOffset, 12);     // Image offset

    directories.push(dir);
    currentOffset += pngBuffer.length;
  }

  // Combine all parts
  return Buffer.concat([header, ...directories, ...pngBuffers]);
}

/**
 * Favicon.ico 생성
 */
function generateFavicon() {
  console.log('Favicon.ico 생성 시작...\n');

  // 각 크기별 PNG 생성
  const pngBuffers = sizes.map((size) => {
    const buffer = drawIcon(size);
    console.log(`✓ ${size}x${size} PNG 생성 완료`);
    return buffer;
  });

  // ICO 파일 생성
  const icoBuffer = createIco(pngBuffers);

  // 저장 경로
  const outputPath = path.join(__dirname, '../src/app/favicon.ico');
  fs.writeFileSync(outputPath, icoBuffer);

  console.log(`\n✓ favicon.ico 생성 완료!`);
  console.log(`출력 파일: ${outputPath}`);
  console.log(`파일 크기: ${icoBuffer.length} bytes`);
}

// 실행
generateFavicon();
