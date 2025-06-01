// グローバル変数
let linkCanvas = null;
let contextMenu = null;
let gridManager = null;
let storageManager = null;
let autoGrouping = null;
let colorManager = null;
let nameGenerator = null;

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[INIT] Link Canvas application starting');

    try {
        // コンポーネント初期化
        await initializeComponents();

        // UI初期化
        initializeUI();

        // データ読み込み
        await loadSavedData();

        // イベントリスナー設定
        setupEventListeners();

        console.log('[INFO] Application initialized successfully');

    } catch (error) {
        console.log('[ERROR] Failed to initialize application:', error);
        showErrorMessage('アプリケーションの初期化に失敗しました');
    }
});

// コンポーネント初期化
async function initializeComponents() {
    // ユーティリティクラス
    colorManager = new ColorManager();
    nameGenerator = new NameGenerator();

    // コアクラス
    gridManager = new GridManager(50);
    storageManager = new StorageManager();

    // メインキャンバス
    linkCanvas = new LinkCanvas();

    // 機能クラス
    autoGrouping = new AutoGrouping(linkCanvas);

    // ContextMenu を一時的に無効化
    // contextMenu = new ContextMenu(linkCanvas);
    contextMenu = null;


    // グローバル参照設定
    window.linkCanvas = linkCanvas;
    window.contextMenu = contextMenu;
    window.gridManager = gridManager;
    window.storageManager = storageManager;

    // キャンバスにグリッドアタッチ
    gridManager.attachToCanvas(linkCanvas.canvas);

    // LinkCanvasに依存オブジェクト注入
    linkCanvas.setDependencies(gridManager, storageManager, autoGrouping, colorManager, nameGenerator);

    console.log('[INFO] All components initialized');
}

// UI初期化
function initializeUI() {
    const canvas = document.getElementById('link-canvas');

    // 初回ヘルプテキスト表示
    if (!hasExistingData()) {
        showHelpText();
    }

    // 設定パネル初期化
    initializeSettingsPanel();

    console.log('[INFO] UI initialized');
}

// データ読み込み
async function loadSavedData() {
    const data = await storageManager.loadData();

    if (data) {
        await linkCanvas.loadFromData(data);

        // ユーティリティクラスの状態復元
        const usedColors = data.groups.map(g => g.color);
        const usedNames = data.groups.map(g => g.name);

        colorManager.restoreUsedColors(usedColors);
        nameGenerator.restoreUsedNames(usedNames);

        console.log('[INFO] Saved data loaded successfully');
        hideHelpText();
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // キーボードショートカット
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // ウィンドウリサイズ
    window.addEventListener('resize', handleWindowResize);

    // ページ離脱時の保存
    window.addEventListener('beforeunload', handleBeforeUnload);

    // ドラッグ&ドロップの全体制御
    setupGlobalDragAndDrop();

    console.log('[INFO] Event listeners set up');
}

// 設定パネル初期化
function initializeSettingsPanel() {
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const importButton = document.getElementById('import-bookmarks');
    const clearButton = document.getElementById('clear-all-data');

    // 設定パネル開閉
    settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
    });

    // パネル外クリックで閉じる
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && !settingsToggle.contains(e.target)) {
            settingsPanel.classList.add('hidden');
        }
    });

    // ブックマークインポート
    importButton.addEventListener('click', handleBookmarkImport);

    // 全データクリア
    clearButton.addEventListener('click', handleClearAllData);

    // ストレージ使用量表示
    updateStorageUsage();
}

// キーボードショートカット
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd キーとの組み合わせ
    const modifier = e.ctrlKey || e.metaKey;

    switch (e.key) {
        case 'Delete':
        case 'Backspace':
            if (linkCanvas.selectedTiles.length > 0) {
                linkCanvas.deleteSelectedTiles();
            }
            break;

        case 'a':
            if (modifier) {
                e.preventDefault();
                linkCanvas.selectAllTiles();
            }
            break;

        case 's':
            if (modifier) {
                e.preventDefault();
                linkCanvas.saveData();
                showSuccessMessage('データを保存しました');
            }
            break;

        case 'g':
            if (modifier && linkCanvas.selectedTiles.length >= 2) {
                e.preventDefault();
                autoGrouping.createManualGroup(linkCanvas.selectedTiles);
            }
            break;

        case 'Escape':
            linkCanvas.clearSelection();
            contextMenu.hide();
            break;

        case 'F1':
            e.preventDefault();
            showHelpDialog();
            break;

        // グリッド表示切り替え
        case 'G':
            if (e.shiftKey) {
                gridManager.toggleGridLines();
            }
            break;
    }
}

// ウィンドウリサイズ処理
function handleWindowResize() {
    // グリッドオーバーレイの更新
    if (gridManager.gridOverlay) {
        gridManager.updateGridOverlay();
    }

    // キャンバスサイズ調整
    const canvas = document.getElementById('link-canvas');
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
}

// ページ離脱時処理
function handleBeforeUnload(e) {
    // 未保存データがある場合の警告
    if (linkCanvas && linkCanvas.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '未保存の変更があります。ページを離れますか？';
        return e.returnValue;
    }
}

// グローバルドラッグ&ドロップ設定
function setupGlobalDragAndDrop() {
    // ブラウザからのURL/画像ドロップ防止
    document.addEventListener('dragover', (e) => {
        if (e.target.id !== 'link-canvas') {
            e.preventDefault();
        }
    });

    document.addEventListener('drop', (e) => {
        if (e.target.id !== 'link-canvas') {
            e.preventDefault();
        }
    });
}

// ブックマークインポート
async function handleBookmarkImport() {
    try {
        const bookmarks = await chrome.bookmarks.getTree();
        const importDialog = createImportDialog(bookmarks);
        document.body.appendChild(importDialog);

    } catch (error) {
        console.log('[ERROR] Failed to import bookmarks:', error);
        showErrorMessage('ブックマークの読み込みに失敗しました');
    }
}

// インポートダイアログ作成
function createImportDialog(bookmarks) {
    const dialog = document.createElement('div');
    dialog.className = 'import-dialog';
    dialog.innerHTML = `
    <div class="dialog-overlay">
      <div class="dialog-content">
        <h3>ブックマークをインポート</h3>
        <div class="bookmark-tree" id="bookmark-tree"></div>
        <div class="dialog-buttons">
          <button id="import-selected">選択項目をインポート</button>
          <button id="cancel-import">キャンセル</button>
        </div>
      </div>
    </div>
  `;

    // スタイル設定
    const style = document.createElement('style');
    style.textContent = `
    .import-dialog {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000;
    }
    .dialog-overlay {
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dialog-content {
      background: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 500px;
      max-height: 600px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .bookmark-tree {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #ddd;
      padding: 10px;
      margin: 10px 0;
    }
    .bookmark-item {
      padding: 2px 0;
      cursor: pointer;
    }
    .bookmark-item:hover {
      background: #f0f0f0;
    }
    .bookmark-item.selected {
      background: #e3f2fd;
    }
    .dialog-buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    .dialog-buttons button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
    }
  `;
    document.head.appendChild(style);

    // ブックマークツリー生成
    const tree = dialog.querySelector('#bookmark-tree');
    const selectedBookmarks = new Set();

    function renderBookmarkNode(node, level = 0) {
        const div = document.createElement('div');
        div.style.marginLeft = (level * 20) + 'px';

        if (node.url) {
            // リーフ（URLあり）
            div.className = 'bookmark-item';
            div.innerHTML = `
        <input type="checkbox" data-url="${node.url}" data-title="${node.title}">
        <img src="https://www.google.com/s2/favicons?domain=${new URL(node.url).hostname}" width="16" height="16">
        ${node.title || node.url}
      `;

            const checkbox = div.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedBookmarks.add({
                        url: node.url,
                        title: node.title || new URL(node.url).hostname
                    });
                } else {
                    selectedBookmarks.delete({
                        url: node.url,
                        title: node.title || new URL(node.url).hostname
                    });
                }
            });
        } else {
            // フォルダ
            div.innerHTML = `<strong>📁 ${node.title}</strong>`;
        }

        tree.appendChild(div);

        // 子ノード再帰処理
        if (node.children) {
            node.children.forEach(child => {
                renderBookmarkNode(child, level + 1);
            });
        }
    }

    bookmarks[0].children.forEach(node => {
        renderBookmarkNode(node);
    });

    // イベントリスナー
    dialog.querySelector('#import-selected').addEventListener('click', () => {
        importSelectedBookmarks([...selectedBookmarks]);
        document.body.removeChild(dialog);
    });

    dialog.querySelector('#cancel-import').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });

    dialog.addEventListener('click', (e) => {
        if (e.target.className === 'dialog-overlay') {
            document.body.removeChild(dialog);
        }
    });

    return dialog;
}

// 選択したブックマークをインポート
function importSelectedBookmarks(bookmarks) {
    let importedCount = 0;
    const startPosition = { x: 100, y: 100 };
    const spacing = gridManager.gridSize + 10;
    const itemsPerRow = Math.floor((window.innerWidth - 200) / spacing);

    bookmarks.forEach((bookmark, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;

        const position = {
            x: startPosition.x + (col * spacing),
            y: startPosition.y + (row * spacing)
        };

        linkCanvas.createLinkTile(bookmark.url, bookmark.title, position);
        importedCount++;
    });

    linkCanvas.saveData();
    showSuccessMessage(`${importedCount}個のブックマークをインポートしました`);
}

// 全データクリア
async function handleClearAllData() {
    const confirmed = confirm('すべてのデータを削除します。この操作は取り消せません。続行しますか？');

    if (confirmed) {
        try {
            await storageManager.clearAllData();
            linkCanvas.clearAll();
            colorManager.reset();
            nameGenerator.reset();

            showSuccessMessage('すべてのデータを削除しました');
            showHelpText();

        } catch (error) {
            console.log('[ERROR] Failed to clear data:', error);
            showErrorMessage('データの削除に失敗しました');
        }
    }
}

// ストレージ使用量更新
async function updateStorageUsage() {
    try {
        const usage = await storageManager.getStorageUsage();
        if (usage) {
            const usageElement = document.getElementById('storage-usage');
            if (usageElement) {
                usageElement.textContent = `ストレージ使用量: ${Math.round(usage.sync.percentage)}%`;
            }
        }
    } catch (error) {
        console.log('[ERROR] Failed to get storage usage:', error);
    }
}

// ヘルプテキスト表示
function showHelpText() {
    const existing = document.querySelector('.help-text');
    if (existing) return;

    const helpText = document.createElement('div');
    helpText.className = 'help-text';
    helpText.innerHTML = `
    <h2>Link Canvas へようこそ！</h2>
    <p>ブックマークバーや他のページからリンクをドラッグ&ドロップしてください</p>
    <p>リンクを重ねて0.8秒待つと自動でグループ化されます</p>
    <p>右上の⚙️からブックマークをインポートできます</p>
  `;

    document.getElementById('link-canvas').appendChild(helpText);
}

// ヘルプテキスト非表示
function hideHelpText() {
    const helpText = document.querySelector('.help-text');
    if (helpText) {
        helpText.classList.add('hidden');
        setTimeout(() => {
            if (helpText.parentNode) {
                helpText.parentNode.removeChild(helpText);
            }
        }, 300);
    }
}

// 既存データチェック
function hasExistingData() {
    return linkCanvas && (linkCanvas.tiles.size > 0 || linkCanvas.groups.size > 0);
}

// 成功メッセージ表示
function showSuccessMessage(message) {
    showToast(message, 'success');
}

// エラーメッセージ表示
function showErrorMessage(message) {
    showToast(message, 'error');
}

// トースト通知
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // スタイル設定
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '6px',
        color: 'white',
        fontSize: '14px',
        zIndex: '10001',
        opacity: '0',
        transform: 'translateY(20px)',
        transition: 'all 0.3s ease'
    });

    // タイプ別色設定
    switch (type) {
        case 'success':
            toast.style.backgroundColor = '#28a745';
            break;
        case 'error':
            toast.style.backgroundColor = '#dc3545';
            break;
        default:
            toast.style.backgroundColor = '#007acc';
    }

    document.body.appendChild(toast);

    // アニメーション
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 100);

    // 自動削除
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ヘルプダイアログ
function showHelpDialog() {
    const helpDialog = document.createElement('div');
    helpDialog.className = 'help-dialog';
    helpDialog.innerHTML = `
    <div class="dialog-overlay">
      <div class="dialog-content">
        <h3>Link Canvas ヘルプ</h3>
        <div class="help-content">
          <h4>基本操作</h4>
          <ul>
            <li>ブックマークバーからリンクをドラッグ&ドロップ</li>
            <li>他のページからURLをコピー&ドロップ</li>
            <li>リンクをクリックでページを開く</li>
          </ul>
          
          <h4>グループ機能</h4>
          <ul>
            <li>リンクを別のリンクに重ねて0.8秒待つ → 自動グループ化</li>
            <li>グループヘッダーをクリック → 展開/縮小</li>
            <li>グループヘッダーを右クリック → 名前表示切り替え</li>
          </ul>
          
          <h4>ショートカットキー</h4>
          <ul>
            <li>Ctrl+A: 全選択</li>
            <li>Ctrl+S: データ保存</li>
            <li>Ctrl+G: 選択項目をグループ化</li>
            <li>Delete: 選択項目を削除</li>
            <li>Shift+G: グリッド表示切り替え</li>
            <li>Esc: 選択解除</li>
            <li>F1: このヘルプ</li>
          </ul>
        </div>
        <button id="close-help">閉じる</button>
      </div>
    </div>
  `;

    document.body.appendChild(helpDialog);

    helpDialog.querySelector('#close-help').addEventListener('click', () => {
        document.body.removeChild(helpDialog);
    });

    helpDialog.addEventListener('click', (e) => {
        if (e.target.className === 'dialog-overlay') {
            document.body.removeChild(helpDialog);
        }
    });
}

// エクスポート機能（右クリックメニューから呼び出し可能）
window.exportData = async () => {
    try {
        await storageManager.exportData();
        showSuccessMessage('データをエクスポートしました');
    } catch (error) {
        showErrorMessage('エクスポートに失敗しました');
    }
};

// インポート機能
window.importData = async (file) => {
    try {
        await storageManager.importData(file);
        await loadSavedData();
        showSuccessMessage('データをインポートしました');
    } catch (error) {
        showErrorMessage('インポートに失敗しました');
    }
};
