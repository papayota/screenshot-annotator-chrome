/**
 * スクリーンショット注釈エディタ - メインスクリプト
 */

// グローバル変数
let backgroundCanvas;
let annotationCanvas;
let backgroundCtx;
let annotationCtx;
let currentTool = 'rectangle';
let annotations = [];
let annotationsHistory = []; // Undo用の履歴
let currentNumber = 1;
let isDrawing = false;
let startX, startY;
let imageData = null;
let originalImageWidth = 0;
let originalImageHeight = 0;

// DOM要素
const toolButtons = document.querySelectorAll('.tool-btn');
const fileInput = document.getElementById('file-input');
const loadFileBtn = document.getElementById('btn-load-file');
const canvasContainer = document.getElementById('canvas-container');
const dropZone = document.getElementById('drop-zone');
const undoBtn = document.getElementById('btn-undo');
const saveBtn = document.getElementById('btn-save');
const clearBtn = document.getElementById('btn-clear');
const messageArea = document.getElementById('message-area');

/**
 * 初期化
 */
function init() {
  // Canvas要素を取得
  backgroundCanvas = document.getElementById('backgroundCanvas');
  annotationCanvas = document.getElementById('annotationCanvas');
  backgroundCtx = backgroundCanvas.getContext('2d');
  annotationCtx = annotationCanvas.getContext('2d');
  
  // URLからimageIdを取得
  const urlParams = new URLSearchParams(window.location.search);
  const imageId = urlParams.get('imageId');
  
  if (imageId) {
    // スクリーンショットから来た場合
    loadImageFromStorage(imageId);
  }
  // imageIdがない場合は、ローカルファイルを読み込むのを待つ
  
  // イベントリスナーを設定
  setupEventListeners();
  
  // ウィンドウリサイズ時にCanvasサイズを再計算
  window.addEventListener('resize', () => {
    if (imageData) {
      updateCanvasDisplaySize();
    }
  });
}

/**
 * ローカル画像ファイルを読み込む
 * @param {File} file - 画像ファイル
 */
function loadLocalImage(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    loadImageToCanvas(dataUrl);
  };
  
  reader.onerror = () => {
    showMessage('画像の読み込みに失敗しました', 'error');
  };
  
  reader.readAsDataURL(file);
}

/**
 * chrome.storage.localから画像データを読み込む
 * @param {string} imageId - 画像ID
 */
function loadImageFromStorage(imageId) {
  chrome.storage.local.get([imageId], (result) => {
    if (chrome.runtime.lastError) {
      showMessage('画像の読み込みに失敗しました: ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    
    const imageDataUrl = result[imageId];
    if (!imageDataUrl) {
      showMessage('画像データが見つかりません', 'error');
      return;
    }
    
    // 画像を読み込んでCanvasに描画
    loadImageToCanvas(imageDataUrl);
  });
}

/**
 * Canvasの表示サイズを更新（画面内に完全に収まるように）
 */
function updateCanvasDisplaySize() {
  if (!originalImageWidth || !originalImageHeight) return;
  
  // requestAnimationFrameでDOMが完全にレンダリングされた後に実行
  requestAnimationFrame(() => {
    // 実際の要素の位置とサイズを正確に取得
    const toolbar = document.querySelector('.toolbar');
    const messageArea = document.querySelector('.message-area');
    const canvasContainer = document.querySelector('.canvas-container');
    
    // ツールバーの実際の高さとマージンを取得
    let toolbarTotalHeight = 0;
    if (toolbar) {
      const toolbarRect = toolbar.getBoundingClientRect();
      const toolbarStyle = window.getComputedStyle(toolbar);
      toolbarTotalHeight = toolbarRect.height + 
        parseFloat(toolbarStyle.marginBottom) || 0;
    }
    
    // メッセージエリアの実際の高さとマージンを取得
    let messageAreaTotalHeight = 0;
    if (messageArea && messageArea.classList.contains('show')) {
      const messageRect = messageArea.getBoundingClientRect();
      const messageStyle = window.getComputedStyle(messageArea);
      messageAreaTotalHeight = messageRect.height + 
        parseFloat(messageStyle.marginBottom) || 0;
    }
    
    // canvas-containerのパディングを取得
    let containerPadding = 20;
    if (canvasContainer) {
      const containerStyle = window.getComputedStyle(canvasContainer);
      const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(containerStyle.paddingBottom) || 0;
      const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
      containerPadding = Math.max(paddingTop + paddingBottom, paddingLeft + paddingRight);
    }
    
    // bodyのパディングを取得
    const bodyStyle = window.getComputedStyle(document.body);
    const bodyPaddingTop = parseFloat(bodyStyle.paddingTop) || 0;
    const bodyPaddingBottom = parseFloat(bodyStyle.paddingBottom) || 0;
    const bodyPaddingLeft = parseFloat(bodyStyle.paddingLeft) || 0;
    const bodyPaddingRight = parseFloat(bodyStyle.paddingRight) || 0;
    const bodyPaddingVertical = bodyPaddingTop + bodyPaddingBottom;
    const bodyPaddingHorizontal = bodyPaddingLeft + bodyPaddingRight;
    
    // 安全マージンを追加（スクロールバーやその他の要素を考慮）
    const safetyMargin = 30;
    
    // 利用可能な幅と高さを計算
    const availableWidth = window.innerWidth - bodyPaddingHorizontal - containerPadding - safetyMargin;
    const availableHeight = window.innerHeight - toolbarTotalHeight - messageAreaTotalHeight - containerPadding - bodyPaddingVertical - safetyMargin;
    
    // 利用可能なサイズが0以下の場合は最小値を設定
    const safeWidth = Math.max(availableWidth, 100);
    const safeHeight = Math.max(availableHeight, 100);
    
    // 画像のアスペクト比を保ちながら、利用可能なサイズに収まる最大サイズを計算
    const scaleX = safeWidth / originalImageWidth;
    const scaleY = safeHeight / originalImageHeight;
    const scale = Math.min(scaleX, scaleY, 1); // 1を超えないように（拡大しない）
    
    // スケール後のサイズ
    const displayWidth = originalImageWidth * scale;
    const displayHeight = originalImageHeight * scale;
    
    // Canvasの表示サイズを設定
    backgroundCanvas.style.width = displayWidth + 'px';
    backgroundCanvas.style.height = displayHeight + 'px';
    annotationCanvas.style.width = displayWidth + 'px';
    annotationCanvas.style.height = displayHeight + 'px';
    
    // canvas-containerの高さを動的に設定（確実に画面内に収めるため）
    if (canvasContainer) {
      const containerRect = canvasContainer.getBoundingClientRect();
      const maxContainerHeight = window.innerHeight - containerRect.top - bodyPaddingBottom - safetyMargin;
      canvasContainer.style.maxHeight = maxContainerHeight + 'px';
      canvasContainer.style.height = (displayHeight + containerPadding) + 'px';
    }
    
    // 注釈を再描画（座標変換が変わるため）
    redrawAnnotations();
  });
}

/**
 * 画像をCanvasに読み込む
 * @param {string} dataUrl - 画像データURL
 */
function loadImageToCanvas(dataUrl) {
  const img = new Image();
  
  img.onload = () => {
    // 画像サイズに合わせてCanvasサイズを設定
    backgroundCanvas.width = img.width;
    backgroundCanvas.height = img.height;
    annotationCanvas.width = img.width;
    annotationCanvas.height = img.height;
    
    // 背景Canvasに画像を描画
    backgroundCtx.drawImage(img, 0, 0);
    
    // 画像データを保存
    imageData = dataUrl;
    originalImageWidth = img.width;
    originalImageHeight = img.height;
    
    // ドロップゾーンを非表示
    if (dropZone) {
      dropZone.classList.remove('active');
    }
    
    // 少し遅延を入れてからサイズ計算（DOMが完全にレンダリングされるのを待つ）
    setTimeout(() => {
      updateCanvasDisplaySize();
      showMessage('画像を読み込みました', 'success');
    }, 100);
  };
  
  img.onerror = () => {
    showMessage('画像の読み込みに失敗しました', 'error');
  };
  
  img.src = dataUrl;
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // ツール選択ボタン
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // アクティブ状態を更新
      toolButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // ツールを変更
      currentTool = btn.dataset.tool;
      console.log('Tool changed to:', currentTool);
    });
  });
  
  // ファイル読み込みボタン
  loadFileBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  // ファイル選択イベント
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      loadLocalImage(file);
    } else {
      showMessage('画像ファイルを選択してください', 'error');
    }
  });
  
  // ドラッグ&ドロップ対応
  canvasContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('active');
  });
  
  canvasContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('active');
  });
  
  canvasContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('active');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadLocalImage(file);
    } else {
      showMessage('画像ファイルをドロップしてください', 'error');
    }
  });
  
  // Undoボタン
  undoBtn.addEventListener('click', undoLastAnnotation);
  
  // 保存ボタン
  saveBtn.addEventListener('click', saveAsPNG);
  
  // クリアボタン
  clearBtn.addEventListener('click', clearAnnotations);
  
  // Canvasイベント
  annotationCanvas.addEventListener('mousedown', handleMouseDown);
  annotationCanvas.addEventListener('mousemove', handleMouseMove);
  annotationCanvas.addEventListener('mouseup', handleMouseUp);
  annotationCanvas.addEventListener('mouseleave', handleMouseUp);
}

/**
 * マウスダウンイベント
 * @param {MouseEvent} e
 */
function handleMouseDown(e) {
  if (!imageData) return;
  
  const coords = getCanvasCoordinates(e);
  
  if (currentTool === 'rectangle' || currentTool === 'arrow') {
    // ドラッグ開始
    isDrawing = true;
    startX = coords.x;
    startY = coords.y;
  } else if (currentTool === 'number') {
    // 番号を配置
    addNumberAnnotation(coords.x, coords.y);
  }
}

/**
 * マウスムーブイベント
 * @param {MouseEvent} e
 */
function handleMouseMove(e) {
  if (!isDrawing || !imageData) return;
  
  const coords = getCanvasCoordinates(e);
  
  // プレビューを描画（一時的な描画）
  redrawAnnotations();
  
  if (currentTool === 'rectangle') {
    drawRectanglePreview(startX, startY, coords.x, coords.y);
  } else if (currentTool === 'arrow') {
    drawArrowPreview(startX, startY, coords.x, coords.y);
  }
}

/**
 * マウスアップイベント
 * @param {MouseEvent} e
 */
function handleMouseUp(e) {
  if (!isDrawing || !imageData) return;
  
  const coords = getCanvasCoordinates(e);
  
  if (currentTool === 'rectangle') {
    // 矩形を追加
    addRectangleAnnotation(startX, startY, coords.x, coords.y);
  } else if (currentTool === 'arrow') {
    // 矢印を追加
    addArrowAnnotation(startX, startY, coords.x, coords.y);
  }
  
  isDrawing = false;
  redrawAnnotations();
}

/**
 * 表示座標をCanvas座標に変換
 * @param {MouseEvent} e
 * @returns {{x: number, y: number}}
 */
function getCanvasCoordinates(e) {
  const rect = annotationCanvas.getBoundingClientRect();
  const scaleX = annotationCanvas.width / rect.width;
  const scaleY = annotationCanvas.height / rect.height;
  
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

/**
 * 矩形注釈を追加
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function addRectangleAnnotation(x1, y1, x2, y2) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  
  // 小さすぎる矩形は無視
  if (width < 5 || height < 5) return;
  
  // 履歴を保存
  saveToHistory();
  
  annotations.push({
    type: 'rectangle',
    x: x,
    y: y,
    width: width,
    height: height,
    color: '#ff3b30',
    lineWidth: 2
  });
  
  redrawAnnotations();
}

/**
 * 矢印注釈を追加
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 */
function addArrowAnnotation(startX, startY, endX, endY) {
  const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  
  // 小さすぎる矢印は無視
  if (distance < 10) return;
  
  // 履歴を保存
  saveToHistory();
  
  annotations.push({
    type: 'arrow',
    startX: startX,
    startY: startY,
    endX: endX,
    endY: endY,
    color: '#ff3b30',
    lineWidth: 2
  });
  
  redrawAnnotations();
}

/**
 * 番号注釈を追加
 * @param {number} x
 * @param {number} y
 */
function addNumberAnnotation(x, y) {
  // 履歴を保存
  saveToHistory();
  
  annotations.push({
    type: 'number',
    x: x,
    y: y,
    number: currentNumber,
    color: '#ff3b30'
  });
  
  currentNumber++;
  if (currentNumber > 9) {
    currentNumber = 1; // 9まで行ったら1に戻す
  }
  
  redrawAnnotations();
}


/**
 * 矩形プレビューを描画
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function drawRectanglePreview(x1, y1, x2, y2) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  
  annotationCtx.strokeStyle = '#ff3b30';
  annotationCtx.lineWidth = 2;
  annotationCtx.setLineDash([5, 5]);
  annotationCtx.strokeRect(x, y, width, height);
  annotationCtx.setLineDash([]);
}

/**
 * 矢印プレビューを描画
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 */
function drawArrowPreview(startX, startY, endX, endY) {
  annotationCtx.strokeStyle = '#ff3b30';
  annotationCtx.lineWidth = 2;
  annotationCtx.setLineDash([5, 5]);
  
  annotationCtx.beginPath();
  annotationCtx.moveTo(startX, startY);
  annotationCtx.lineTo(endX, endY);
  annotationCtx.stroke();
  annotationCtx.setLineDash([]);
}

/**
 * すべての注釈を再描画
 */
function redrawAnnotations() {
  // 前面Canvasをクリア
  annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
  
  // 各注釈を描画
  annotations.forEach(annotation => {
    switch (annotation.type) {
      case 'rectangle':
        drawRectangle(annotation);
        break;
      case 'arrow':
        drawArrow(annotation);
        break;
      case 'number':
        drawNumber(annotation);
        break;
    }
  });
}

/**
 * 矩形を描画
 * @param {Object} annotation
 */
function drawRectangle(annotation) {
  const { x, y, width, height, color, lineWidth } = annotation;
  
  annotationCtx.strokeStyle = color;
  annotationCtx.lineWidth = lineWidth;
  annotationCtx.strokeRect(x, y, width, height);
}

/**
 * 矢印を描画
 * @param {Object} annotation
 */
function drawArrow(annotation) {
  const { startX, startY, endX, endY, color, lineWidth } = annotation;
  
  // 矢印の線を描画
  annotationCtx.strokeStyle = color;
  annotationCtx.lineWidth = lineWidth;
  annotationCtx.beginPath();
  annotationCtx.moveTo(startX, startY);
  annotationCtx.lineTo(endX, endY);
  annotationCtx.stroke();
  
  // アローヘッド（矢印の先端）を描画
  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowLength = 15;
  const arrowAngle = Math.PI / 6; // 30度
  
  annotationCtx.beginPath();
  annotationCtx.moveTo(endX, endY);
  annotationCtx.lineTo(
    endX - arrowLength * Math.cos(angle - arrowAngle),
    endY - arrowLength * Math.sin(angle - arrowAngle)
  );
  annotationCtx.lineTo(
    endX - arrowLength * Math.cos(angle + arrowAngle),
    endY - arrowLength * Math.sin(angle + arrowAngle)
  );
  annotationCtx.closePath();
  annotationCtx.fillStyle = color;
  annotationCtx.fill();
}

/**
 * 番号を描画
 * @param {Object} annotation
 */
function drawNumber(annotation) {
  const { x, y, number, color } = annotation;
  const radius = 30; // 15から30に拡大
  
  // 丸を描画
  annotationCtx.beginPath();
  annotationCtx.arc(x, y, radius, 0, Math.PI * 2);
  annotationCtx.fillStyle = color;
  annotationCtx.fill();
  
  // 数字を描画
  annotationCtx.fillStyle = '#ffffff';
  annotationCtx.font = 'bold 28px Arial'; // 16pxから28pxに拡大
  annotationCtx.textAlign = 'center';
  annotationCtx.textBaseline = 'middle';
  annotationCtx.fillText(number.toString(), x, y);
}

/**
 * 履歴を保存（Undo用）
 */
function saveToHistory() {
  // 現在の状態をコピーして履歴に保存
  annotationsHistory.push(JSON.parse(JSON.stringify(annotations)));
  
  // 履歴が多すぎる場合は古いものを削除（最大50件）
  if (annotationsHistory.length > 50) {
    annotationsHistory.shift();
  }
}

/**
 * 最後の操作を元に戻す（Undo）
 */
function undoLastAnnotation() {
  if (annotationsHistory.length === 0) {
    showMessage('戻す操作がありません', 'info');
    return;
  }
  
  // 履歴から前の状態を復元
  annotations = annotationsHistory.pop();
  
  // 番号を再計算（番号注釈の最大値を取得）
  const numberAnnotations = annotations.filter(a => a.type === 'number');
  if (numberAnnotations.length > 0) {
    const maxNumber = Math.max(...numberAnnotations.map(a => a.number));
    currentNumber = maxNumber + 1;
    // 9を超えた場合は1に戻す
    if (currentNumber > 9) {
      currentNumber = 1;
    }
  } else {
    // 番号注釈がなくなった場合は1から開始
    currentNumber = 1;
  }
  
  redrawAnnotations();
}

/**
 * 注釈をクリア
 */
function clearAnnotations() {
  if (confirm('すべての注釈を削除しますか？')) {
    // 履歴もクリア
    annotationsHistory = [];
    annotations = [];
    currentNumber = 1;
    redrawAnnotations();
    showMessage('注釈をクリアしました', 'info');
  }
}

/**
 * Canvasを合成してPNGとして保存
 */
function saveAsPNG() {
  if (!imageData) {
    showMessage('画像が読み込まれていません', 'error');
    return;
  }
  
  // 2つのCanvasを合成
  const mergedCanvas = document.createElement('canvas');
  mergedCanvas.width = backgroundCanvas.width;
  mergedCanvas.height = backgroundCanvas.height;
  const mergedCtx = mergedCanvas.getContext('2d');
  
  // 背景Canvasを描画
  mergedCtx.drawImage(backgroundCanvas, 0, 0);
  
  // 前面Canvas（注釈）を描画
  mergedCtx.drawImage(annotationCanvas, 0, 0);
  
  // PNGに変換してダウンロード
  mergedCanvas.toBlob((blob) => {
    if (!blob) {
      showMessage('画像の生成に失敗しました', 'error');
      return;
    }
    
    const url = URL.createObjectURL(blob);
    
    // ファイル名を生成
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const filename = `annotated-${year}${month}${day}-${hours}${minutes}${seconds}.png`;
    
    chrome.downloads.download(
      {
        url: url,
        filename: filename,
        saveAs: false
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          showMessage('保存に失敗しました: ' + chrome.runtime.lastError.message, 'error');
          URL.revokeObjectURL(url);
          return;
        }
        
        showMessage('画像を保存しました: ' + filename, 'success');
        
        // メモリを解放
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }
    );
  }, 'image/png');
}

/**
 * メッセージを表示
 * @param {string} message - メッセージ
 * @param {string} type - タイプ（error, success, info）
 */
function showMessage(message, type = 'info') {
  messageArea.textContent = message;
  messageArea.className = `message-area show ${type}`;
  
  // メッセージ表示時にCanvasサイズを再計算
  setTimeout(() => {
    if (imageData) {
      updateCanvasDisplaySize();
    }
  }, 100);
  
  // 3秒後に自動で非表示
  setTimeout(() => {
    messageArea.classList.remove('show');
    // メッセージ非表示時にもCanvasサイズを再計算
    if (imageData) {
      updateCanvasDisplaySize();
    }
  }, 3000);
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', init);

