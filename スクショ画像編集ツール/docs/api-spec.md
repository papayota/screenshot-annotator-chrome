# Chrome API仕様書

## 使用するChrome APIs

本プロジェクトで使用するChrome Extension APIの詳細仕様と実装方法。

---

## 1. chrome.tabs.captureVisibleTab

### 概要
現在アクティブなタブの表示範囲をスクリーンショットとして取得する。

### 権限
- `"activeTab"` または `"tabs"`

### 使用方法

```javascript
// service_worker.js
chrome.tabs.captureVisibleTab(
  { format: 'png' },
  (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError.message);
      return;
    }
    // dataUrl: "data:image/png;base64,..."
    console.log('Screenshot captured');
  }
);
```

### パラメータ
- `options` (object, optional):
  - `format`: `'png'` | `'jpeg'` (デフォルト: `'png'`)
  - `quality`: 0-100 (jpegのみ、デフォルト: 92)

### 戻り値
- `dataUrl` (string): Base64エンコードされた画像データURL

### エラーハンドリング
- `chrome.runtime.lastError` をチェック
- 権限不足、タブが読み込まれていない場合にエラー

### 注意点
- 表示中の範囲のみを取得（ページ全体のスクロール領域は含まない）
- 取得した画像は現在のビューポートのサイズ

---

## 2. chrome.storage.local

### 概要
拡張機能内でデータをローカルストレージに保存・読み込みする。

### 権限
- `"storage"`

### 使用方法

#### データ保存

```javascript
// service_worker.js
const imageId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

chrome.storage.local.set(
  { [imageId]: dataUrl },
  () => {
    if (chrome.runtime.lastError) {
      console.error('Save error:', chrome.runtime.lastError);
      return;
    }
    console.log('Image saved:', imageId);
  }
);
```

#### データ読み込み

```javascript
// editor.js
const urlParams = new URLSearchParams(window.location.search);
const imageId = urlParams.get('imageId');

chrome.storage.local.get([imageId], (result) => {
  if (chrome.runtime.lastError) {
    console.error('Load error:', chrome.runtime.lastError);
    return;
  }
  
  const imageData = result[imageId];
  if (!imageData) {
    console.error('Image not found');
    return;
  }
  
  // 画像をCanvasに描画
  loadImageToCanvas(imageData);
});
```

#### データ削除（任意）

```javascript
// 使用済みデータのクリーンアップ
chrome.storage.local.remove([imageId], () => {
  console.log('Image data removed');
});
```

### 制限事項
- **容量制限**: 約10MB（拡張機能全体で）
- **データ形式**: JSON形式（オブジェクト、配列、文字列、数値など）
- **非同期処理**: コールバックまたはPromiseで処理

### 注意点
- 画像データ（dataURL）は文字列として保存されるため、大きな画像は容量を消費する
- 保存・読み込みは非同期のため、コールバック内で処理を続行

---

## 3. chrome.downloads.download

### 概要
ファイルをダウンロードフォルダに保存する。

### 権限
- `"downloads"`

### 使用方法

```javascript
// editor.js
function saveAsPNG(canvas) {
  // CanvasをPNGに変換
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    
    // ファイル名生成
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:]/g, '').slice(0, 15);
    const filename = `annotated-${dateStr}.png`;
    
    chrome.downloads.download(
      {
        url: url,
        filename: filename,
        saveAs: false  // trueにすると「名前を付けて保存」ダイアログが表示
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download error:', chrome.runtime.lastError);
          return;
        }
        console.log('Download started:', downloadId);
        
        // メモリ解放
        URL.revokeObjectURL(url);
      }
    );
  }, 'image/png');
}
```

### パラメータ
- `options` (object):
  - `url`: ダウンロードするファイルのURL（dataURL、blob URLなど）
  - `filename`: 保存するファイル名（パスを含むことも可能）
  - `saveAs`: `true` で「名前を付けて保存」ダイアログを表示

### 戻り値
- `downloadId` (number): ダウンロードID（キャンセルなどに使用可能）

### エラーハンドリング
- `chrome.runtime.lastError` をチェック
- 権限不足、ディスク容量不足の場合にエラー

### 注意点
- `blob URL` を使用する場合は、`URL.revokeObjectURL()` でメモリを解放
- `dataURL` を直接使用することも可能（ただし長い文字列になる）

---

## 4. chrome.tabs.create

### 概要
新しいタブを開く。

### 権限
- `"tabs"` (または `"activeTab"` で十分な場合もある)

### 使用方法

```javascript
// service_worker.js
chrome.tabs.create(
  {
    url: chrome.runtime.getURL(`editor.html?imageId=${imageId}`)
  },
  (tab) => {
    if (chrome.runtime.lastError) {
      console.error('Tab creation error:', chrome.runtime.lastError);
      return;
    }
    console.log('Editor tab opened:', tab.id);
  }
);
```

### パラメータ
- `options` (object):
  - `url`: 開くURL（拡張機能内のファイルは `chrome.runtime.getURL()` を使用）
  - `active`: `true` でタブをアクティブにする（デフォルト: `true`）

### 戻り値
- `tab` (object): 作成されたタブの情報

### 注意点
- 拡張機能内のHTMLファイルを開く場合は `chrome.runtime.getURL()` を使用
- クエリパラメータでデータIDを渡す

---

## 5. chrome.action.onClicked

### 概要
拡張機能のアイコン（action）がクリックされたときに発火するイベント。

### 権限
- 特になし（manifest.jsonで `action` を設定）

### 使用方法

```javascript
// service_worker.js
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
  
  // スクリーンショット取得処理
  captureScreenshot();
});
```

### パラメータ
- `tab` (object): クリックされたタブの情報

### 注意点
- `popup` が設定されている場合は、このイベントは発火しない
- 今回は `popup` を使わず、このイベントで処理を開始

---

## 6. chrome.runtime.getURL

### 概要
拡張機能内のファイルのURLを取得する。

### 権限
- 特になし

### 使用方法

```javascript
// service_worker.js
const editorUrl = chrome.runtime.getURL('editor.html');
// 例: "chrome-extension://abcdefghijklmnop/editor.html"

// editor.js
const imageUrl = chrome.runtime.getURL('icons/icon48.png');
```

### パラメータ
- `path` (string): 拡張機能内のファイルパス（manifest.jsonからの相対パス）

### 戻り値
- `url` (string): 拡張機能のURL

---

## 実装例: 統合コード

### service_worker.js の主要部分

```javascript
// スクリーンショット取得とeditor起動
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error('Capture error:', chrome.runtime.lastError);
      return;
    }
    
    // 画像ID生成
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // storageに保存
    chrome.storage.local.set({ [imageId]: dataUrl }, () => {
      if (chrome.runtime.lastError) {
        console.error('Save error:', chrome.runtime.lastError);
        return;
      }
      
      // editorを開く
      chrome.tabs.create({
        url: chrome.runtime.getURL(`editor.html?imageId=${imageId}`)
      });
    });
  });
});
```

### editor.js の主要部分

```javascript
// 画像読み込み
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const imageId = urlParams.get('imageId');
  
  if (!imageId) {
    console.error('No imageId provided');
    return;
  }
  
  chrome.storage.local.get([imageId], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Load error:', chrome.runtime.lastError);
      return;
    }
    
    const imageData = result[imageId];
    if (!imageData) {
      console.error('Image not found');
      return;
    }
    
    // Canvasに画像を描画
    loadImageToCanvas(imageData);
  });
});

// PNG保存
function saveAsPNG() {
  const canvas = mergeCanvases(); // 背景+前面を合成
  canvas.toBlob((blob) => {
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

---

## エラーハンドリングのベストプラクティス

1. **常に `chrome.runtime.lastError` をチェック**
2. **エラーメッセージをユーザーに表示**（alertではなく、UI内で表示）
3. **非同期処理の順序を保証**（コールバック内で次の処理を実行）
4. **メモリリークを防ぐ**（blob URLの解放など）

