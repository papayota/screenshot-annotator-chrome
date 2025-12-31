# 実装メモ・技術的決定事項

## 技術的な決定事項

### 1. Canvas実装方式

**決定**: 2層Canvas構造（背景Canvas + 前面Canvas）

**理由**:
- スクショ画像は固定で再描画不要
- 注釈のみを再描画することでパフォーマンス向上
- 実装がシンプル

**実装方針**:
```javascript
// HTML
<canvas id="backgroundCanvas"></canvas>
<canvas id="annotationCanvas"></canvas>

// CSS: 2つのCanvasを重ねる
#backgroundCanvas, #annotationCanvas {
  position: absolute;
  top: 0;
  left: 0;
}
```

### 2. 座標変換の実装

**問題**: CSSで拡大縮小したCanvasで、マウス座標とCanvas座標が一致しない

**解決方法**:
```javascript
function getCanvasCoordinates(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}
```

**注意点**:
- `canvas.width/height` と `canvas.offsetWidth/Height` の違いを理解する
- 画像のアスペクト比を維持してCanvasサイズを設定

### 3. 注釈データの管理

**決定**: 配列で注釈データを保持し、再描画時に全注釈を描画

**データ構造**:
```javascript
const annotations = [];

// 矩形
annotations.push({
  type: 'rectangle',
  x: 100, y: 100,
  width: 200, height: 150,
  color: '#ff3b30',
  lineWidth: 2
});

// 矢印
annotations.push({
  type: 'arrow',
  startX: 50, startY: 50,
  endX: 200, endY: 200,
  color: '#ff3b30',
  lineWidth: 2
});

// 番号
annotations.push({
  type: 'number',
  x: 150, y: 150,
  number: 1,
  color: '#ff3b30'
});

// テキスト
annotations.push({
  type: 'text',
  x: 250, y: 250,
  text: '説明',
  fontSize: 16,
  color: '#ff3b30'
});
```

**再描画ロジック**:
```javascript
function redrawAnnotations() {
  const ctx = annotationCanvas.getContext('2d');
  ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
  
  annotations.forEach(annotation => {
    switch (annotation.type) {
      case 'rectangle':
        drawRectangle(ctx, annotation);
        break;
      case 'arrow':
        drawArrow(ctx, annotation);
        break;
      case 'number':
        drawNumber(ctx, annotation);
        break;
      case 'text':
        drawText(ctx, annotation);
        break;
    }
  });
}
```

### 4. 矢印の描画

**アローヘッド（矢印の先端）の実装**:

```javascript
function drawArrow(ctx, annotation) {
  const { startX, startY, endX, endY, color, lineWidth } = annotation;
  
  // 矢印の線を描画
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  
  // アローヘッドを描画
  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowLength = 15;
  const arrowAngle = Math.PI / 6; // 30度
  
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowLength * Math.cos(angle - arrowAngle),
    endY - arrowLength * Math.sin(angle - arrowAngle)
  );
  ctx.lineTo(
    endX - arrowLength * Math.cos(angle + arrowAngle),
    endY - arrowLength * Math.sin(angle + arrowAngle)
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
```

### 5. 番号アイコンの連番機能

**実装方針**:
```javascript
let currentNumber = 1;

function addNumberAnnotation(x, y) {
  annotations.push({
    type: 'number',
    x: x,
    y: y,
    number: currentNumber,
    color: '#ff3b30'
  });
  
  currentNumber++;
  if (currentNumber > 9) {
    currentNumber = 1; // 9まで行ったら1に戻す（または警告）
  }
  
  redrawAnnotations();
}
```

**描画**:
```javascript
function drawNumber(ctx, annotation) {
  const { x, y, number, color } = annotation;
  const radius = 15;
  
  // 丸を描画
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  
  // 数字を描画
  ctx.fillStyle = '#ffffff'; // 白文字
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number.toString(), x, y);
}
```

### 6. Canvas合成とPNG保存

**実装**:
```javascript
function mergeCanvases() {
  const backgroundCanvas = document.getElementById('backgroundCanvas');
  const annotationCanvas = document.getElementById('annotationCanvas');
  
  // 新しいCanvasを作成
  const mergedCanvas = document.createElement('canvas');
  mergedCanvas.width = backgroundCanvas.width;
  mergedCanvas.height = backgroundCanvas.height;
  const ctx = mergedCanvas.getContext('2d');
  
  // 背景を描画
  ctx.drawImage(backgroundCanvas, 0, 0);
  
  // 注釈を描画
  ctx.drawImage(annotationCanvas, 0, 0);
  
  return mergedCanvas;
}

function saveAsPNG() {
  const mergedCanvas = mergeCanvases();
  mergedCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const filename = `annotated-${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}.png`;
    
    chrome.downloads.download({ url, filename }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download error:', chrome.runtime.lastError);
        return;
      }
      URL.revokeObjectURL(url);
    });
  }, 'image/png');
}
```

## トラブルシューティング

### 問題1: Canvasの座標がずれる

**原因**: CSS拡大縮小とCanvas内部サイズの不一致

**解決**:
- `canvas.width/height` を画像サイズに合わせる
- マウス座標を変換する際にスケールを考慮

### 問題2: 画像が表示されない

**原因**: 
- storage.localからの読み込みタイミング
- dataURLの形式が正しくない

**解決**:
- `DOMContentLoaded` イベントで読み込み
- dataURLの形式を確認（`data:image/png;base64,...`）

### 問題3: 保存したPNGが空

**原因**: Canvasの合成タイミング

**解決**:
- 合成処理を同期的に実行
- `toBlob` のコールバック内でダウンロード

### 問題4: 大きな画像でstorage.localの容量超過

**原因**: 10MB制限

**解決**:
- 画像を圧縮する（品質を下げる）
- 使用済みデータを削除する
- 画像サイズをチェックして警告を表示

## パフォーマンス最適化（将来の拡張）

### 現在の実装（シンプル）
- 注釈追加時に全注釈を再描画
- シンプルで理解しやすい

### 最適化案（MVP外）
- 差分描画（追加した注釈のみ描画）
- バッファリング（オフスクリーンCanvas）
- レイヤー管理（注釈ごとにレイヤー分け）

## コード品質

### コーディング規約
- 関数名は動詞で始める（`drawRectangle`, `saveAsPNG`）
- 変数名は明確で意味が分かるもの
- コメントは「なぜ」を説明（「何を」はコードから分かる）

### エラーハンドリング
- すべてのChrome API呼び出しで `chrome.runtime.lastError` をチェック
- ユーザーに分かりやすいエラーメッセージを表示
- コンソールログは開発時のみ（本番では削除または条件付き）

### テスト観点
- 各注釈ツールの動作確認
- 座標変換の精度確認
- エッジケース（大きな画像、小さな画像、画面外クリックなど）
- ブラウザ互換性（Chrome最新版）

## 参考リソース

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

