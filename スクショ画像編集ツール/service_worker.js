/**
 * Chrome拡張 - スクリーンショット注釈エディタ
 * Service Worker: スクリーンショット取得、データ保存、editor起動
 */

// 拡張アイコンクリック時の処理
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
  
  // スクリーンショット取得
  captureScreenshot();
});

/**
 * スクリーンショットを取得し、editorを起動する
 */
function captureScreenshot() {
  chrome.tabs.captureVisibleTab(
    { format: 'png' },
    (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Screenshot capture error:', chrome.runtime.lastError.message);
        // エラー時はユーザーに通知（簡易的にコンソールログ）
        return;
      }
      
      if (!dataUrl) {
        console.error('No screenshot data received');
        return;
      }
      
      console.log('Screenshot captured successfully');
      
      // 画像IDを生成（タイムスタンプ + ランダム文字列）
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // storage.localに画像データを保存
      saveImageToStorage(imageId, dataUrl);
    }
  );
}

/**
 * 画像データをchrome.storage.localに保存し、editorを開く
 * @param {string} imageId - 画像ID
 * @param {string} dataUrl - 画像データ（dataURL形式）
 */
function saveImageToStorage(imageId, dataUrl) {
  chrome.storage.local.set(
    { [imageId]: dataUrl },
    () => {
      if (chrome.runtime.lastError) {
        console.error('Storage save error:', chrome.runtime.lastError.message);
        return;
      }
      
      console.log('Image saved to storage:', imageId);
      
      // editor.htmlを新しいタブで開く
      openEditor(imageId);
    }
  );
}

/**
 * editor.htmlを新しいタブで開く
 * @param {string} imageId - 画像ID
 */
function openEditor(imageId) {
  const editorUrl = chrome.runtime.getURL(`editor.html?imageId=${imageId}`);
  
  chrome.tabs.create(
    {
      url: editorUrl,
      active: true
    },
    (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Tab creation error:', chrome.runtime.lastError.message);
        return;
      }
      
      console.log('Editor tab opened:', tab.id);
    }
  );
}

