/**
 * 生成 LoreNest 应用图标 PNG（256x256）
 * 纯 Node.js，无外部依赖，使用原始 PNG 二进制格式
 *
 * 设计：深色背景 + 琥珀金六芒菱形 + "LN" monospace 字样
 * 运行：node scripts/gen-icon.js
 */

const fs   = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 256

// ── 创建像素缓冲 ────────────────────────────────────────────
const pixels = Buffer.alloc(SIZE * SIZE * 4, 0) // RGBA

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  pixels[i]     = r
  pixels[i + 1] = g
  pixels[i + 2] = b
  pixels[i + 3] = a
}

function fillRect(x0, y0, w, h, r, g, b, a = 255) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++)
      setPixel(x, y, r, g, b, a)
}

function drawLine(x0, y0, x1, y1, r, g, b, thick = 2) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let x = x0, y = y0
  while (true) {
    for (let tx = -thick; tx <= thick; tx++)
      for (let ty = -thick; ty <= thick; ty++)
        setPixel(x + tx, y + ty, r, g, b)
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x += sx }
    if (e2 <  dx) { err += dx; y += sy }
  }
}

function fillCircle(cx, cy, radius, r, g, b, a = 255) {
  for (let y = -radius; y <= radius; y++)
    for (let x = -radius; x <= radius; x++)
      if (x * x + y * y <= radius * radius)
        setPixel(cx + x, cy + y, r, g, b, a)
}

// ── 背景 #0d0f1a ────────────────────────────────────────────
fillRect(0, 0, SIZE, SIZE, 13, 15, 26)

// ── 圆角遮罩（模拟圆角矩形背景） ──────────────────────────
const R = 38
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const inCorner =
      (x < R && y < R && (x - R) ** 2 + (y - R) ** 2 > R * R) ||
      (x > SIZE - R - 1 && y < R && (x - (SIZE - R - 1)) ** 2 + (y - R) ** 2 > R * R) ||
      (x < R && y > SIZE - R - 1 && (x - R) ** 2 + (y - (SIZE - R - 1)) ** 2 > R * R) ||
      (x > SIZE - R - 1 && y > SIZE - R - 1 && (x - (SIZE - R - 1)) ** 2 + (y - (SIZE - R - 1)) ** 2 > R * R)
    if (inCorner) {
      const i = (y * SIZE + x) * 4
      pixels[i + 3] = 0 // transparent
    }
  }
}

// ── 斜切角右上 ──────────────────────────────────────────────
for (let i = 0; i < 36; i++) {
  for (let j = 0; j <= 36 - i; j++) {
    setPixel(SIZE - 1 - i, j, 0, 0, 0, 0)
  }
}

// ── 琥珀金菱形框（主视觉） ─────────────────────────────────
const cx = 128, cy = 126
const r1 = 72  // 外层大菱形
const r2 = 58  // 内层空心

// 填充大菱形（半透明琥珀）
for (let y = cy - r1; y <= cy + r1; y++) {
  for (let x = cx - r1; x <= cx + r1; x++) {
    const d = Math.abs(x - cx) + Math.abs(y - cy)
    if (d <= r1) setPixel(x, y, 232, 160, 32, 28)
  }
}

// 菱形边框（实线）
for (let y = cy - r1; y <= cy + r1; y++) {
  for (let x = cx - r1; x <= cx + r1; x++) {
    const d = Math.abs(x - cx) + Math.abs(y - cy)
    if (d >= r1 - 3 && d <= r1) setPixel(x, y, 232, 160, 32, 255)
  }
}

// 内层小菱形线框（细）
for (let y = cy - r2; y <= cy + r2; y++) {
  for (let x = cx - r2; x <= cx + r2; x++) {
    const d = Math.abs(x - cx) + Math.abs(y - cy)
    if (d >= r2 - 1 && d <= r2) setPixel(x, y, 232, 160, 32, 120)
  }
}

// ── 中心 "L" 字形（monospace 像素字体风格） ────────────────
// 笔画宽 8px，整体尺寸 28x38
const lx = cx - 14, ly = cy - 19
// 竖画
fillRect(lx, ly, 8, 38, 232, 160, 32)
// 横画
fillRect(lx, ly + 30, 28, 8, 232, 160, 32)

// ── 右上角装饰短线（品牌细节） ─────────────────────────────
drawLine(SIZE - 40, 12, SIZE - 14, 12, 232, 160, 32, 1)
drawLine(SIZE - 34, 18, SIZE - 14, 18, 232, 160, 32, 0)

// ── 左下角点装饰 ───────────────────────────────────────────
fillRect(14, SIZE - 22, 5, 5, 0, 200, 232, 180)
fillRect(22, SIZE - 22, 5, 5, 0, 200, 232, 80)

// ── 编码为 PNG ──────────────────────────────────────────────
function crc32(buf) {
  let crc = 0xFFFFFFFF
  const table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c
  }
  for (const b of buf) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const len  = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t    = Buffer.from(type)
  const crc  = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

// IHDR
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8   // bit depth
ihdr[9] = 6   // RGBA
ihdr[10] = ihdr[11] = ihdr[12] = 0

// IDAT: filter byte 0 before each row, then deflate
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0 // filter type None
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}
const compressed = zlib.deflateSync(raw, { level: 9 })

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
])

const outDir  = path.join(__dirname, '../build')
const outPath = path.join(outDir, 'icon.png')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outPath, png)
console.log(`✓ 图标已生成：${outPath}  (${png.length} bytes)`)
