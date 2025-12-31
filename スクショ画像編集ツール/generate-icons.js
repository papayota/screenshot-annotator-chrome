/**
 * アイコンファイル生成スクリプト
 * Node.jsでCanvas APIを使用してアイコンを生成
 */

const fs = require('fs');
const { createCanvas } = require('canvas');

// 生成するアイコンサイズ
const sizes = [16, 48, 128];

/**
 * アイコンを描画する関数
 * @param {CanvasRenderingContext2D} ctx - Canvasコンテキスト
 * @param {number} size - アイコンサイズ
 */
function drawIcon(ctx, size) {
  const padding = size * 0.1;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // 背景（グラデーション）
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#4a90e2');
  gradient.addColorStop(1, '#357abd');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // 角丸の背景
  ctx.fillStyle = '#ffffff';
  const cornerRadius = size * 0.15;
  roundRect(ctx, padding, padding, size - padding * 2, size - padding * 2, cornerRadius);
  ctx.fill();
  
  // 画面の枠を描画（スクリーンショットを表現）
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = Math.max(1, size * 0.03);
  const screenPadding = size * 0.2;
  ctx.strokeRect(screenPadding, screenPadding, size - screenPadding * 2, size - screenPadding * 2);
  
  // 画面内に小さな四角（コンテンツを表現）
  const contentPadding = size * 0.25;
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(contentPadding, contentPadding, size - contentPadding * 2, size - contentPadding * 2);
  
  // 注釈を表す矢印を描画（右上から）
  const arrowStartX = size * 0.65;
  const arrowStartY = size * 0.25;
  const arrowEndX = size * 0.8;
  const arrowEndY = size * 0.15;
  
  ctx.strokeStyle = '#ff3b30';
  ctx.lineWidth = Math.max(2, size * 0.04);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 矢印の線
  ctx.beginPath();
  ctx.moveTo(arrowStartX, arrowStartY);
  ctx.lineTo(arrowEndX, arrowEndY);
  ctx.stroke();
  
  // 矢印の先端
  const angle = Math.atan2(arrowEndY - arrowStartY, arrowEndX - arrowStartX);
  const arrowLength = size * 0.08;
  const arrowAngle = Math.PI / 6;
  
  ctx.beginPath();
  ctx.moveTo(arrowEndX, arrowEndY);
  ctx.lineTo(
    arrowEndX - arrowLength * Math.cos(angle - arrowAngle),
    arrowEndY - arrowLength * Math.sin(angle - arrowAngle)
  );
  ctx.lineTo(
    arrowEndX - arrowLength * Math.cos(angle + arrowAngle),
    arrowEndY - arrowLength * Math.sin(angle + arrowAngle)
  );
  ctx.closePath();
  ctx.fillStyle = '#ff3b30';
  ctx.fill();
  
  // 番号を表す丸（左下）
  const circleX = size * 0.3;
  const circleY = size * 0.75;
  const circleRadius = size * 0.08;
  
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#ff3b30';
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(8, size * 0.12)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', circleX, circleY);
}

/**
 * 角丸矩形を描画
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * アイコンファイルを生成
 */
function generateIcons() {
  // iconsディレクトリが存在しない場合は作成
  const iconsDir = './icons';
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // アイコンを描画
    drawIcon(ctx, size);
    
    // PNGファイルとして保存
    const buffer = canvas.toBuffer('image/png');
    const filename = `${iconsDir}/icon${size}.png`;
    fs.writeFileSync(filename, buffer);
    
    console.log(`✓ Generated ${filename} (${size}x${size}px)`);
  });
  
  console.log('\n✅ All icon files generated successfully!');
}

// スクリプト実行
try {
  generateIcons();
} catch (error) {
  console.error('Error generating icons:', error.message);
  console.error('\nPlease make sure you have installed the "canvas" package:');
  console.error('  npm install canvas');
  process.exit(1);
}

