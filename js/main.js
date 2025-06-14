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
        await initializeComponents();
        initializeUI();
        await loadSavedData();
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
    contextMenu = new ContextMenu(linkCanvas);

    // グローバル参照設定
    window.linkCanvas = linkCanvas;
    window.contextMenu = contextMenu;
    window.gridManager = gridManager;
    window.storageManager = storageManager;

    // 依存関係注入
    linkCanvas.setDependencies(gridManager, storageManager, autoGrouping, colorManager, nameGenerator);

    console.log('[INFO] All components initialized');
}

// UI初期化
function initializeUI() {
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const importButton = document.getElementById('import-bookmarks');
    const clearButton = document.getElementById('clear-all-data');
    const trashButton = document.getElementById('show-trash-area');
    const exportButton = document.getElementById('export-bookmarks');

    // 設定パネル開閉
    if (settingsToggle) {
        settingsToggle.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });
    }

    // パネル外クリックで閉じる
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && !settingsToggle.contains(e.target)) {
            settingsPanel.classList.add('hidden');
        }
    });

    // ブックマークインポート
    if (importButton) {
        importButton.addEventListener('click', handleBookmarkImport);
    }

    // 消しゴムモード
    if (trashButton) {
        trashButton.textContent = '消しゴムモード';
        trashButton.addEventListener('click', () => {
            document.querySelector('#settings-panel').classList.add('hidden');
            createEraserMode();
        });
    }

    // エクスポート機能
    if (exportButton) {
        exportButton.addEventListener('click', handleExportBookmarks);
    }

    // 全データクリア
    if (clearButton) {
        clearButton.addEventListener('click', handleClearAllData);
    }

    // 手動タイル作成ボタン
    const manualTileButton = document.getElementById('manual-tile-button');
    if (manualTileButton) {
        manualTileButton.addEventListener('click', showManualTileDialog);
    }

    // 現在タブインポートボタン
    const importTabsButton = document.getElementById('import-current-tabs');
    if (importTabsButton) {
        importTabsButton.addEventListener('click', handleCurrentTabsImport);
     }


    console.log('[INFO] UI initialized');
}

// データ読み込み
// loadSavedData関数を修正：

async function loadSavedData() {


    const data = await storageManager.loadData();

    if (data) {
        await linkCanvas.loadFromData(data);



        console.log('[INFO] Saved data loaded successfully');
    }
}


// イベントリスナー設定
function setupEventListeners() {
    // キーボードショートカット
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // ウィンドウリサイズ
    window.addEventListener('resize', handleWindowResize);

    // 空白エリア右クリック
    document.getElementById('link-canvas').addEventListener('contextmenu', (e) => {
        if (e.target.id === 'link-canvas') {
            e.preventDefault();
            showCanvasContextMenu(e);
        }
    });

    console.log('[INFO] Event listeners set up');
}

// showCanvasContextMenu関数：

function showCanvasContextMenu(e) {
    const menu = document.createElement('div');
    menu.className = 'canvas-context-menu';
    menu.innerHTML = `
        <div class="context-item" id="clear-canvas">🗑️ 全削除</div>
    `;

    menu.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        min-width: 120px;
    `;

    // 全削除のみ（Undo削除のため）
    menu.querySelector('#clear-canvas').addEventListener('click', () => {
        if (confirm('すべてのタイルとグループを削除しますか？')) {
            linkCanvas.clearAll();
            linkCanvas.saveData();
            showSuccessMessage('すべて削除しました');
        }
        document.body.removeChild(menu);
    });

    // メニュー外クリックで閉じる
    setTimeout(() => {
        const closeMenu = () => {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', closeMenu);
        };
        document.addEventListener('click', closeMenu);
    }, 100);

    document.body.appendChild(menu);
}




// キーボードショートカット
// handleKeyboardShortcuts関数を以下に置換：

function handleKeyboardShortcuts(e) {
    const modifier = e.ctrlKey || e.metaKey;

    switch (e.key) {
        case 's':
            if (modifier) {
                e.preventDefault();
                linkCanvas.saveData();
                showSuccessMessage('データを保存しました');
            }
            break;


        case 'v':
            if (modifier) {
                e.preventDefault();
                handleClipboardPaste();
            }
            break;

        case 'Escape':
            if (contextMenu) {
                contextMenu.hide();
            }
            break;
    }
}

// 新しい関数：クリップボード監視
async function handleClipboardPaste() {
    try {
        // クリップボード内容を取得
        const clipboardText = await navigator.clipboard.readText();

        if (!clipboardText || clipboardText.trim().length === 0) {
            console.log('[DEBUG] Clipboard is empty');
            return;
        }

        const text = clipboardText.trim();
        console.log('[DEBUG] Clipboard content:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));

        // URL判定（厳密な正規表現）
        const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

        if (!urlPattern.test(text)) {
            console.log('[DEBUG] Clipboard content is not a valid URL');
            return;
        }

        // URLが有効な場合、自動でタイル作成
        console.log('[INFO] Valid URL detected in clipboard, creating tile');


        // 空いている位置を探す
        const position = window.gridManager.findNearestFreePosition(100, 100);

        // 自動タイトル生成
        let title;
        try {
            const domain = new URL(text).hostname;
            title = linkCanvas.generateSmartTitle(text, domain);
        } catch (error) {
            title = 'Clipboard Link';
        }

        // タイル作成
        const tile = linkCanvas.createLinkTile(text, title, position);

        // 成功フィードバック（控えめ）
        showSuccessMessage(`タイル「${title}」を作成しました`);

        console.log('[INFO] Tile created from clipboard successfully:', tile.id);

    } catch (error) {
        // エラーは静かに処理（ユーザーには表示しない）
        console.log('[DEBUG] Clipboard access failed or content invalid:', error.message);

        // クリップボードアクセス権限がない場合の代替処理
        if (error.name === 'NotAllowedError') {
            console.log('[DEBUG] Clipboard access not allowed in this context');
        }
    }
}


// ウィンドウリサイズ処理
function handleWindowResize() {
    const canvas = document.getElementById('link-canvas');
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
}

// エクスポート機能

async function handleExportBookmarks() {
    try {
        if (linkCanvas.tiles.size === 0) {
            showErrorMessage('エクスポートするタイルがありません');
            return;
        }

        // 確認ダイアログ表示
        const folderName = `Link Canvas Export ${new Date().toLocaleDateString()}`;
        const confirmMessage = `${linkCanvas.tiles.size}個のタイルを\nブックマークフォルダ「${folderName}」にエクスポートします。\n\n作成しますか？`;

        if (!confirm(confirmMessage)) {
            return;
        }

        // エクスポート処理中は重複実行を防止
        const exportButton = document.getElementById('export-bookmarks');
        if (exportButton) {
            exportButton.disabled = true;
            exportButton.textContent = 'エクスポート中...';
        }

        try {
            // フォルダ作成
            const folder = await chrome.bookmarks.create({
                title: folderName
            });

            let exportCount = 0;
            const errors = [];

            // タイルを順次エクスポート
            for (const [id, tile] of linkCanvas.tiles) {
                try {
                    await chrome.bookmarks.create({
                        parentId: folder.id,
                        title: tile.title,
                        url: tile.url
                    });
                    exportCount++;
                } catch (error) {
                    errors.push(`${tile.title}: ${error.message}`);
                    console.log('[ERROR] Failed to export tile:', tile.title, error);
                }
            }

            // 結果表示
            if (errors.length === 0) {
                showSuccessMessage(`✅ ${exportCount}個のタイルをエクスポートしました`);
            } else {
                showSuccessMessage(`⚠️ ${exportCount}個エクスポート完了（${errors.length}個失敗）`);
                console.log('[WARNING] Export errors:', errors);
            }

        } finally {
            // ボタンを元に戻す
            if (exportButton) {
                exportButton.disabled = false;
                exportButton.textContent = '📤 ブックマークにエクスポート';
            }
        }

    } catch (error) {
        console.log('[ERROR] Failed to export bookmarks:', error);
        showErrorMessage('エクスポートに失敗しました');

        // ボタンを元に戻す
        const exportButton = document.getElementById('export-bookmarks');
        if (exportButton) {
            exportButton.disabled = false;
            exportButton.textContent = '📤 ブックマークにエクスポート';
        }
    }
}


// 消しゴムモード
function createEraserMode() {
    let eraserActive = false;
    let eraserElement = null;
    let deletedTiles = [];



    function createEraser(x, y) {
        eraserElement = document.createElement('div');
        eraserElement.id = 'eraser-cursor';
        eraserElement.innerHTML = '🧽';
        eraserElement.style.cssText = `
            position: fixed;
            left: ${x - 25}px;
            top: ${y - 25}px;
            width: 50px;
            height: 50px;
            background: rgba(255, 107, 107, 0.8);
            border: 3px solid #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        `;
        document.body.appendChild(eraserElement);
    }

    function handleMouseDown(e) {
        if (e.button === 0) {
            eraserActive = true;
            createEraser(e.clientX, e.clientY);
            checkTileCollision(e.clientX, e.clientY);
        }
    }

    function handleMouseMove(e) {
        if (eraserActive && eraserElement) {
            eraserElement.style.left = (e.clientX - 25) + 'px';
            eraserElement.style.top = (e.clientY - 25) + 'px';
            checkTileCollision(e.clientX, e.clientY);
        }
    }

    function handleMouseUp(e) {
        if (eraserActive) {
            eraserActive = false;
            if (eraserElement) {
                document.body.removeChild(eraserElement);
                eraserElement = null;
            }

            if (deletedTiles.length > 0) {
                window.linkCanvas.saveData();
                console.log('[INFO] Eraser session complete, data saved');
                deletedTiles = [];
            }
        }
    }

    function checkTileCollision(mouseX, mouseY) {
        const elements = document.elementsFromPoint(mouseX, mouseY);

        for (const element of elements) {
            if (element.classList.contains('link-tile')) {
                const tileId = Array.from(window.linkCanvas.tiles.entries())
                    .find(([id, tile]) => tile.element === element)?.[0];

                if (tileId && !deletedTiles.includes(tileId)) {
                    const tile = window.linkCanvas.tiles.get(tileId);

                    if (tile.groupId) {
                        const group = window.linkCanvas.groups.get(tile.groupId);
                        if (group) {
                            group.removeTile(tile);
                            if (group.tiles.length === 0) {
                                group.element.remove();
                                window.linkCanvas.groups.delete(group.id);
                            }
                        }
                    }

                    element.remove();
                    window.linkCanvas.tiles.delete(tileId);
                    deletedTiles.push(tileId);

                    console.log('[INFO] Tile erased:', tileId);
                }
                break;
            }
        }
    }

    function exitEraserMode() {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        if (eraserElement) {
            document.body.removeChild(eraserElement);
        }

        if (deletedTiles.length > 0) {
            window.linkCanvas.saveData();
        }

        const exitButton = document.getElementById('exit-eraser');
        if (exitButton) {
            document.body.removeChild(exitButton);
        }

        showSuccessMessage('消しゴムモード終了');
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    const exitButton = document.createElement('button');
    exitButton.id = 'exit-eraser';
    exitButton.innerHTML = '消しゴムモード終了';
    exitButton.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        background: linear-gradient(135deg, #ff6b6b, #dc3545);
        color: white;
        border: none;
        border-radius: 25px;
        font-weight: bold;
        cursor: pointer;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    `;

    exitButton.addEventListener('click', exitEraserMode);
    document.body.appendChild(exitButton);

    showSuccessMessage('消しゴムモード開始！Ctrl+Zで元に戻せます');
}

// 以下、既存の関数群（省略部分は元のまま）
async function handleBookmarkImport() {
    try {
        const bookmarks = await chrome.bookmarks.getTree();
        showImportMethodDialog(bookmarks);
    } catch (error) {
        console.log('[ERROR] Failed to import bookmarks:', error);
        showErrorMessage('ブックマークの読み込みに失敗しました');
    }
}

// 残りの関数は元のコードと同じですが、重要な修正点：
// 1. サイドパネルのdragendイベントに安全チェック追加

// 残りの関数群...（元のコードをそのまま使用、但しdragendに安全チェック追加）


// 新しい関数：インポート方式選択ダイアログ
function showImportMethodDialog(bookmarks) {
    const dialog = document.createElement('div');
    dialog.className = 'method-dialog';
    dialog.innerHTML = `
        <div class="method-dialog-overlay">
            <div class="method-dialog-content">
                <h3>ブックマークインポート方式</h3>
                <p>インポート方法を選択してください</p>
                
                <div class="method-options">
                    <button class="method-button primary" id="method-sidepanel">

                        <div class="method-text">
                            <strong>サイドパネル</strong>
                            <small>ドラッグ&ドロップ</small>
                        </div>
                    </button>
                    
                    <button class="method-button" id="method-dialog">

                        <div class="method-text">
                            <strong>選択式</strong>
                            <small>CheckBox一括選択</small>
                        </div>
                    </button>
                </div>
                
                <button class="cancel-button" id="method-cancel">キャンセル</button>
            </div>
        </div>
    `;

    // スタイル設定
    const style = document.createElement('style');
    style.textContent = `
        .method-dialog {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            background: rgba(0,0,0,0.5);
        }
        
        .method-dialog-overlay {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .method-dialog-content {
            background: white;
            border-radius: 16px;
            padding: 24px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        
        .method-dialog-content h3 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 18px;
        }
        
        .method-dialog-content p {
            margin: 0 0 20px 0;
            color: #666;
            font-size: 14px;
        }
        
        .method-options {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }
        
.method-button {
            flex: 1;
            padding: 16px 12px;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            background: #f8f9fa;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .method-button:hover {
            border-color: #007acc;
            background: #e3f2fd;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,122,204,0.2);
        }

        .method-text strong {
            display: block;
            font-size: 14px;
            margin-bottom: 4px;
            color: #333;
        }

        .method-text small {
            font-size: 10px;
            opacity: 0.7;
            color: #666;
            white-space: nowrap;
        }
        
.method-button:hover {
    border-color: #007acc;
    background: #e3f2fd;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,122,204,0.2);
}
        
        .method-icon {
            font-size: 24px;
        }
        
        .method-text strong {
            display: block;
            font-size: 14px;
            margin-bottom: 4px;
        }
        
        .method-text small {
            font-size: 11px;
            opacity: 0.8;
        }
        
        .cancel-button {
            padding: 8px 20px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            color: #666;
            font-size: 12px;
        }
        
        .cancel-button:hover {
            background: #f8f9fa;
        }
    `;
    document.head.appendChild(style);

    // イベントリスナー
    dialog.querySelector('#method-sidepanel').addEventListener('click', () => {
        document.body.removeChild(dialog);
        createBookmarkSidePanel(bookmarks);
    });

    dialog.querySelector('#method-dialog').addEventListener('click', () => {
        document.body.removeChild(dialog);
        const importDialog = createBookmarkImportDialog(bookmarks);
        document.body.appendChild(importDialog);
    });

    dialog.querySelector('#method-cancel').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });

    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
        if (e.target.className === 'method-dialog-overlay') {
            document.body.removeChild(dialog);
        }
    });

    document.body.appendChild(dialog);
}


// 新しい関数：移動可能サイドパネル作成
function createBookmarkSidePanel(bookmarks) {
    // 既存パネルがあれば削除
    const existingPanel = document.getElementById('bookmark-side-panel');
    if (existingPanel) {
        document.body.removeChild(existingPanel);
    }

    const panel = document.createElement('div');
    panel.id = 'bookmark-side-panel';
    panel.innerHTML = `
        <div class="side-panel-header" id="side-panel-header">
            <div class="header-left">
                <span class="drag-handle">⋮⋮</span>
                <h3>ブックマーク</h3>
            </div>
            <button id="close-side-panel">✕</button>
        </div>
        <div class="side-panel-content" id="side-panel-bookmarks"></div>
    `;

    // スタイル設定
    const style = document.createElement('style');
    style.textContent = `
        #bookmark-side-panel {
            position: fixed;
            top: 100px;
            right: 20px;
            width: 280px;
            height: 400px;
            background: rgba(255,255,255,0.98);
            border: 2px solid #007acc;
            border-radius: 12px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            resize: both;
            overflow: hidden;
            min-width: 200px;
            min-height: 300px;
        }
        
        .side-panel-header {
            padding: 12px 16px;
            background: linear-gradient(135deg, #007acc, #0056b3);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            border-radius: 10px 10px 0 0;
            user-select: none;
        }
        
        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .drag-handle {
            font-size: 16px;
            opacity: 0.7;
            cursor: move;
        }
        
        .side-panel-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
        }
        
        #close-side-panel {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s ease;
        }
        
        #close-side-panel:hover {
            background: rgba(255,255,255,0.2);
        }
        
        .side-panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }
        
        .draggable-bookmark {
            padding: 8px 12px;
            margin: 2px 0;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            cursor: grab;
            display: flex;
            align-items: center;
            transition: all 0.2s ease;
            position: relative;
        }
        
        .draggable-bookmark:hover {
            background: #e3f2fd;
            transform: translateX(4px);
            border-color: #007acc;
            box-shadow: 0 2px 8px rgba(0,122,204,0.2);
        }
        
        .draggable-bookmark:active {
            cursor: grabbing;
            transform: scale(0.98);
        }
        
        .draggable-bookmark img {
            margin-right: 8px;
            flex-shrink: 0;
        }
        
        .draggable-bookmark span {
            font-size: 12px;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .bookmark-folder {
            padding: 6px 12px;
            margin: 2px 0;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            font-weight: 600;
            font-size: 11px;
            color: #856404;
        }
        
        .side-panel-content::-webkit-scrollbar {
            width: 6px;
        }
        
        .side-panel-content::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }
        
        .side-panel-content::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
        }
        
        .side-panel-content::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
    `;
    document.head.appendChild(style);

    // ブックマーク要素作成
    const content = panel.querySelector('#side-panel-bookmarks');

    function renderDraggableBookmarks(nodes, level = 0) {
        for (const node of nodes) {
            if (node.url) {
                // ドラッグ可能なブックマーク
                const bookmarkEl = document.createElement('div');
                bookmarkEl.className = 'draggable-bookmark';
                bookmarkEl.draggable = true;
                bookmarkEl.style.marginLeft = (level * 12) + 'px';

                bookmarkEl.innerHTML = `
                    <img src="https://www.google.com/s2/favicons?domain=${new URL(node.url).hostname}" width="14" height="14">
                    <span title="${node.title || node.url}">${node.title || node.url}</span>
                `;

                // ドラッグイベント設定
                bookmarkEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/uri-list', node.url);
                    e.dataTransfer.setData('text/plain', node.title || node.url);
                    e.dataTransfer.effectAllowed = 'copy';

                    // ドラッグ中の視覚フィードバック
                    bookmarkEl.style.opacity = '0.5';
                    console.log('[DEBUG] Dragging bookmark:', node.title);
                });

                bookmarkEl.addEventListener('dragend', (e) => {
                    if (bookmarkEl && bookmarkEl.style) {
                        bookmarkEl.style.opacity = '1';
                    }
                });

                content.appendChild(bookmarkEl);

            } else if (node.children && node.children.length > 0) {
                // フォルダ表示
                const folderEl = document.createElement('div');
                folderEl.className = 'bookmark-folder';
                folderEl.style.marginLeft = (level * 12) + 'px';
                folderEl.innerHTML = `📁 ${node.title}`;
                content.appendChild(folderEl);

                // 子要素を再帰的に追加
                renderDraggableBookmarks(node.children, level + 1);
            }
        }
    }

    // ブックマークツリー構築
    if (bookmarks[0] && bookmarks[0].children) {
        renderDraggableBookmarks(bookmarks[0].children);
    }

    // パネル移動機能
    makePanelDraggable(panel);

    // 閉じるボタン
    panel.querySelector('#close-side-panel').addEventListener('click', () => {
        document.body.removeChild(panel);
    });

    document.body.appendChild(panel);

    // 成功メッセージ
    showSuccessMessage('ドラッグ＆ドロップでタイルを作成できます');
}

// パネル移動機能
// makePanelDraggable関数を以下に置換：

function makePanelDraggable(panel) {
    // ヘッダーを動的に検索（複数のIDパターンに対応）
    const header = panel.querySelector('.side-panel-header') ||
        panel.querySelector('.tabs-panel-header') ||
        panel.querySelector('[id$="-header"]');

    if (!header) {
        console.log('[WARNING] Draggable header not found in panel');
        return;
    }

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
        // 閉じるボタンクリック時は移動しない
        if (e.target.id.includes('close-')) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = panel.offsetLeft;
        startTop = panel.offsetTop;

        header.style.cursor = 'grabbing';

        console.log('[DEBUG] Panel drag started');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let newLeft = startLeft + deltaX;
        let newTop = startTop + deltaY;

        // 画面境界制限
        newLeft = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, newLeft));
        newTop = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, newTop));

        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
            console.log('[DEBUG] Panel drag ended');
        }
    });
}




function createBookmarkImportDialog(bookmarks) {
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
            background: rgba(0,0,0,0.5);
        }
        .dialog-overlay {
            width: 100%;
            height: 100%;
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
            padding: 6px 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            border-radius: 4px;
            transition: background-color 0.2s ease;
        }
        .bookmark-item:hover {
            background: #e3f2fd;
        }
        .bookmark-item input[type="checkbox"] {
            margin-right: 8px;
            cursor: pointer;
        }
        .bookmark-item img {
            margin-right: 8px;
        }
        .bookmark-item span {
            flex: 1;
            cursor: pointer;
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
            // renderBookmarkNode関数内のdiv.innerHTML部分を以下に置換：

            div.innerHTML = `
                <input type="checkbox" data-url="${node.url}" data-title="${node.title}" id="cb-${Date.now()}-${Math.random()}">
                <img src="https://www.google.com/s2/favicons?domain=${new URL(node.url).hostname}" width="16" height="16">
                <span>${node.title || node.url}</span>
            `;

            // クリック領域拡大
            div.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = div.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
            // checkbox changeイベントリスナー
            const checkbox = div.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                const bookmarkData = {
                    url: node.url,
                    title: node.title || new URL(node.url).hostname
                };

                if (e.target.checked) {
                    selectedBookmarks.add(bookmarkData);
                    console.log('[DEBUG] Bookmark added:', bookmarkData.title);
                } else {
                    // Setから削除（参照比較のため特別な処理）
                    for (const existing of selectedBookmarks) {
                        if (existing.url === bookmarkData.url) {
                            selectedBookmarks.delete(existing);
                            console.log('[DEBUG] Bookmark removed:', existing.title);
                            break;
                        }
                    }
                }

                console.log('[DEBUG] Selected count:', selectedBookmarks.size);
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

    // ブックマークツリー構築
    if (bookmarks[0] && bookmarks[0].children) {
        bookmarks[0].children.forEach(node => {
            renderBookmarkNode(node);
        });
    }

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

// 既存のimportSelectedBookmarks関数を置換：

function importSelectedBookmarks(bookmarks) {
    console.log('[DEBUG] Importing bookmarks:', bookmarks.length, bookmarks);

    if (!bookmarks || bookmarks.length === 0) {
        showErrorMessage('選択されたブックマークがありません');
        return;
    }

    let x = 50, y = 50;
    const gridSize = 60;
    const maxPerRow = Math.floor((window.innerWidth - 100) / gridSize);

    let importedCount = 0;

    bookmarks.forEach((bookmark, index) => {
        if (bookmark.url && bookmark.url.startsWith('http')) {
            const row = Math.floor(index / maxPerRow);
            const col = index % maxPerRow;

            const position = {
                x: 50 + col * gridSize,
                y: 50 + row * gridSize
            };

            console.log('[DEBUG] Creating tile for:', bookmark.title, 'at:', position);
            linkCanvas.createLinkTile(bookmark.url, bookmark.title, position);
            importedCount++;
        }
    });

    console.log('[DEBUG] Import completed:', importedCount, 'tiles created');
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

        } catch (error) {
            console.log('[ERROR] Failed to clear data:', error);
            showErrorMessage('データの削除に失敗しました');
        }
    }
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
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '6px';
    toast.style.color = 'white';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '10001';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    toast.textContent = message;

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


    // ゴミ箱モード選択ダイアログ
    function showTrashAreaDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'trash-dialog';
        dialog.innerHTML = `
        <div class="trash-dialog-overlay">
            <div class="trash-dialog-content">
                <h3>🗑️ ゴミ箱エリア</h3>
                <p>削除方式を選択してください</p>
                
                <div class="trash-options">
                    <button class="trash-button" id="trash-static">
                        <div class="trash-icon">📍</div>
                        <div class="trash-text">
                            <strong>固定ゴミ箱</strong>
                            <small>ドラッグ&ドロップで削除</small>
                        </div>
                    </button>
                    
                    <button class="trash-button" id="trash-eraser">
                        <div class="trash-icon">🧽</div>
                        <div class="trash-text">
                            <strong>消しゴム</strong>
                            <small>ドラッグして範囲削除</small>
                        </div>
                    </button>
                </div>
                
                <button class="cancel-button" id="trash-cancel">キャンセル</button>
            </div>
        </div>
    `;

        // スタイル設定
        const style = document.createElement('style');
        style.textContent = `
        .trash-dialog {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            background: rgba(0,0,0,0.5);
        }
        
        .trash-dialog-overlay {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .trash-dialog-content {
            background: white;
            border-radius: 16px;
            padding: 24px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        
        .trash-options {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .trash-button {
            flex: 1;
            padding: 16px 12px;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            background: #f8f9fa;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
        
        .trash-button:hover {
            border-color: #dc3545;
            background: #ffe6e6;
            transform: translateY(-2px);
        }
        
        .trash-icon {
            font-size: 24px;
        }
        
        .trash-text strong {
            display: block;
            font-size: 14px;
            margin-bottom: 4px;
        }
        
        .trash-text small {
            font-size: 10px;
            opacity: 0.7;
            white-space: nowrap;
        }
    `;
        document.head.appendChild(style);

        // イベントリスナー
        dialog.querySelector('#trash-static').addEventListener('click', () => {
            document.body.removeChild(dialog);
            createStaticTrashArea();
        });

        dialog.querySelector('#trash-eraser').addEventListener('click', () => {
            document.body.removeChild(dialog);
            createEraserMode();
        });

        dialog.querySelector('#trash-cancel').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        dialog.addEventListener('click', (e) => {
            if (e.target.className === 'trash-dialog-overlay') {
                document.body.removeChild(dialog);
            }
        });

        document.body.appendChild(dialog);
    }

    // 固定ゴミ箱エリア作成
    function createStaticTrashArea() {
        // 既存ゴミ箱があれば削除
        const existingTrash = document.getElementById('static-trash-area');
        if (existingTrash) {
            document.body.removeChild(existingTrash);
        }

        const trashArea = document.createElement('div');
        trashArea.id = 'static-trash-area';
        trashArea.innerHTML = `
        <div class="trash-header" id="trash-header">
            <span class="drag-handle">⋮⋮</span>
            <span class="trash-title">🗑️ ゴミ箱</span>
            <button id="close-trash">✕</button>
        </div>
        <div class="trash-drop-zone">
            <div class="trash-icon-large">🗑️</div>
            <div class="trash-message">ここにドラッグして削除</div>
        </div>
    `;

        // スタイル
        const style = document.createElement('style');
        style.textContent = `
        #static-trash-area {
            position: fixed;
            top: 200px;
            left: 20px;
            width: 120px;
            height: 120px;
            background: linear-gradient(135deg, #ff6b6b, #dc3545);
            border: 3px solid #fff;
            border-radius: 16px;
            z-index: 1000;
            box-shadow: 0 8px 24px rgba(220, 53, 69, 0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .trash-header {
            padding: 8px;
            background: rgba(0,0,0,0.2);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            font-size: 10px;
        }
        
        .trash-drop-zone {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
        }
        
        .trash-icon-large {
            font-size: 32px;
            margin-bottom: 4px;
        }
        
        .trash-message {
            font-size: 9px;
            font-weight: bold;
        }
        
        #static-trash-area.drag-over {
            background: linear-gradient(135deg, #ff4757, #c0392b);
            transform: scale(1.1);
        }
        
        #close-trash {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 12px;
        }
    `;
        document.head.appendChild(style);

        // ドラッグ&ドロップ機能
        trashArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            trashArea.classList.add('drag-over');
        });

        trashArea.addEventListener('dragleave', (e) => {
            if (!trashArea.contains(e.relatedTarget)) {
                trashArea.classList.remove('drag-over');
            }
        });

        trashArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            trashArea.classList.remove('drag-over');

            // タイル削除処理
            if (window.linkCanvas && window.linkCanvas.dragState.draggedTile) {
                const tile = window.linkCanvas.dragState.draggedTile;

                // グループから除外
                if (tile.groupId) {
                    const group = window.linkCanvas.groups.get(tile.groupId);
                    if (group) {
                        group.removeTile(tile);
                        if (group.tiles.length === 0) {
                            group.element.remove();
                            window.linkCanvas.groups.delete(group.id);
                        }
                    }
                }

                // タイル削除
                tile.element.remove();
                window.linkCanvas.tiles.delete(tile.id);
                window.linkCanvas.saveData();

                // フィードバック
                showSuccessMessage('タイルを削除しました');

                console.log('[INFO] Tile deleted via trash area:', tile.id);
            }
        });

        // 移動機能
        makePanelDraggable(trashArea);

        // 閉じるボタン
        trashArea.querySelector('#close-trash').addEventListener('click', () => {
            document.body.removeChild(trashArea);
        });

        document.body.appendChild(trashArea);
        showSuccessMessage('固定ゴミ箱を表示しました');
    }

    // 消しゴムモード作成
// createEraserMode関数を以下に置換：

function createEraserMode() {
    let eraserActive = false;
    let eraserElement = null;
    let deletedTiles = []; // 削除されたタイルの記録

    // 消しゴム要素作成
    function createEraser(x, y) {
        eraserElement = document.createElement('div');
        eraserElement.id = 'eraser-cursor';
        eraserElement.innerHTML = '🧽';
        eraserElement.style.cssText = `
            position: fixed;
            left: ${x - 25}px;
            top: ${y - 25}px;
            width: 50px;
            height: 50px;
            background: rgba(255, 107, 107, 0.8);
            border: 3px solid #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        `;
        document.body.appendChild(eraserElement);
    }

    // マウスイベント
    function handleMouseDown(e) {
        if (e.button === 0) { // 左クリック
            eraserActive = true;
            createEraser(e.clientX, e.clientY);
            checkTileCollision(e.clientX, e.clientY);
        }
    }

    function handleMouseMove(e) {
        if (eraserActive && eraserElement) {
            eraserElement.style.left = (e.clientX - 25) + 'px';
            eraserElement.style.top = (e.clientY - 25) + 'px';
            checkTileCollision(e.clientX, e.clientY);
        }
    }

    function handleMouseUp(e) {
        if (eraserActive) {
            eraserActive = false;
            if (eraserElement) {
                document.body.removeChild(eraserElement);
                eraserElement = null;
            }

            // 削除後にデータ保存（重要！）
            if (deletedTiles.length > 0) {
                window.linkCanvas.saveData();
                console.log('[INFO] Eraser session complete, data saved');
                deletedTiles = [];
            }
        }
    }

    // createEraserMode関数内のcheckTileCollision関数を修正：

    function checkTileCollision(mouseX, mouseY) {
        const elements = document.elementsFromPoint(mouseX, mouseY);

        for (const element of elements) {
            if (element.classList.contains('link-tile')) {
                const tileId = Array.from(window.linkCanvas.tiles.entries())
                    .find(([id, tile]) => tile.element === element)?.[0];

                if (tileId && !deletedTiles.includes(tileId)) {
                  
                  

                    const tile = window.linkCanvas.tiles.get(tileId);

                    if (tile.groupId) {
                        const group = window.linkCanvas.groups.get(tile.groupId);
                        if (group) {
                            group.removeTile(tile);
                            if (group.tiles.length === 0) {
                                group.element.remove();
                                window.linkCanvas.groups.delete(group.id);
                            }
                        }
                    }

                    element.remove();
                    window.linkCanvas.tiles.delete(tileId);
                    deletedTiles.push(tileId);

                    console.log('[INFO] Tile erased:', tileId);
                }
                break;
            }
        }
    }


    // イベントリスナー追加
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 終了機能
    function exitEraserMode() {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        if (eraserElement) {
            document.body.removeChild(eraserElement);
        }

        // 最終データ保存
        if (deletedTiles.length > 0) {
            window.linkCanvas.saveData();
        }

        // 終了ボタン削除
        const exitButton = document.getElementById('exit-eraser');
        if (exitButton) {
            document.body.removeChild(exitButton);
        }

        showSuccessMessage('消しゴムモード終了');
    }

    // 終了ボタン作成
    const exitButton = document.createElement('button');
    exitButton.id = 'exit-eraser';
    exitButton.innerHTML = '消しゴムモード終了';
    exitButton.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        background: linear-gradient(135deg, #ff6b6b, #dc3545);
        color: white;
        border: none;
        border-radius: 25px;
        font-weight: bold;
        cursor: pointer;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    `;

    exitButton.addEventListener('click', exitEraserMode);
    document.body.appendChild(exitButton);

    showSuccessMessage('左クリック+ドラッグでタイルを削除');
}

// 新しい関数：手動タイル作成ダイアログ
function showManualTileDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'manual-tile-dialog';
    dialog.innerHTML = `
        <div class="dialog-overlay">
            <div class="dialog-content">
                <h3>➕ 手動でタイル作成</h3>
                <div class="input-group">
                    <label for="tile-url">URL:</label>
                    <input type="url" id="tile-url" placeholder="https://example.com" required>
                </div>
                <div class="input-group">
                    <label for="tile-title">タイトル:</label>
                    <input type="text" id="tile-title" placeholder="サイト名" required>
                </div>
                <div class="dialog-buttons">
                    <button id="create-tile-btn" class="primary-btn">作成</button>
                    <button id="cancel-tile-btn" class="secondary-btn">キャンセル</button>
                </div>
            </div>
        </div>
    `;

    // スタイル設定
    const style = document.createElement('style');
    style.textContent = `
        .manual-tile-dialog {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            background: rgba(0,0,0,0.5);
        }
        
        .manual-tile-dialog .dialog-overlay {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .manual-tile-dialog .dialog-content {
            background: white;
            border-radius: 12px;
            padding: 24px;
            min-width: 400px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        
        .manual-tile-dialog h3 {
            margin: 0 0 20px 0;
            color: #333;
            text-align: center;
        }
        
        .input-group {
            margin-bottom: 16px;
        }
        
        .input-group label {
            display: block;
            margin-bottom: 6px;
            font-weight: bold;
            color: #555;
        }
        
        .input-group input {
            width: 100%;
            padding: 8px 12px;
            border: 2px solid #e9ecef;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.2s ease;
        }
        
        .input-group input:focus {
            outline: none;
            border-color: #28a745;
        }
        
        .dialog-buttons {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 20px;
        }
        
        .primary-btn {
            padding: 10px 20px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }
        
        .primary-btn:hover {
            background: #218838;
        }
        
        .secondary-btn {
            padding: 10px 20px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        
        .secondary-btn:hover {
            background: #5a6268;
        }
    `;
    document.head.appendChild(style);

    // イベントリスナー
    dialog.querySelector('#create-tile-btn').addEventListener('click', () => {
        const url = dialog.querySelector('#tile-url').value.trim();
        const title = dialog.querySelector('#tile-title').value.trim();

        if (url && title) {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                // 空いている位置を探す
                const position = window.gridManager.findNearestFreePosition(100, 100);


                // タイル作成
                linkCanvas.createLinkTile(url, title, position);
                showSuccessMessage(`タイル「${title}」を作成しました`);
                document.body.removeChild(dialog);
            } else {
                alert('正しいURL形式で入力してください（http:// または https:// で始まる）');
            }
        } else {
            alert('URLとタイトルの両方を入力してください');
        }
    });

    dialog.querySelector('#cancel-tile-btn').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });

    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
        if (e.target.className === 'dialog-overlay') {
            document.body.removeChild(dialog);
        }
    });

    // ESCキーで閉じる
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(dialog);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    document.body.appendChild(dialog);

    // URLフィールドにフォーカス
    setTimeout(() => {
        dialog.querySelector('#tile-url').focus();
    }, 100);
}


// 新しい関数：現在タブインポート
async function handleCurrentTabsImport() {
    try {
        // 現在開いているタブ一覧を取得
        const tabs = await chrome.tabs.query({});

        if (tabs.length === 0) {
            showErrorMessage('開いているタブがありません');
            return;
        }

        // HTTP/HTTPSタブのみフィルタ
        const validTabs = tabs.filter(tab =>
            tab.url &&
            (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
            !tab.url.startsWith('chrome://') &&
            !tab.url.startsWith('chrome-extension://')
        );

        if (validTabs.length === 0) {
            showErrorMessage('インポート可能なタブがありません');
            return;
        }

        createCurrentTabsPanel(validTabs);

    } catch (error) {
        console.log('[ERROR] Failed to get current tabs:', error);
        showErrorMessage('タブ情報の取得に失敗しました');
    }
}

// 新しい関数：現在タブパネル作成
function createCurrentTabsPanel(tabs) {
    // 既存パネルがあれば削除
    const existingPanel = document.getElementById('current-tabs-panel');
    if (existingPanel) {
        document.body.removeChild(existingPanel);
    }

    const panel = document.createElement('div');
    panel.id = 'current-tabs-panel';
    panel.innerHTML = `
        <div class="tabs-panel-header" id="tabs-panel-header">
            <div class="header-left">
                <span class="drag-handle">⋮⋮</span>
                <h3>📋 現在のタブ (${tabs.length})</h3>
            </div>
            <button id="close-tabs-panel">✕</button>
        </div>
        <div class="tabs-panel-content" id="tabs-panel-content"></div>
    `;

    // スタイル設定
    const style = document.createElement('style');
    style.textContent = `
        #current-tabs-panel {
            position: fixed;
            top: 150px;
            left: 20px;
            width: 300px;
            height: 400px;
            background: rgba(255,255,255,0.98);
            border: 2px solid #28a745;
            border-radius: 12px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 24px rgba(40,167,69,0.3);
            backdrop-filter: blur(10px);
            resize: both;
            overflow: hidden;
            min-width: 250px;
            min-height: 300px;
        }
        
        .tabs-panel-header {
            padding: 12px 16px;
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            border-radius: 10px 10px 0 0;
            user-select: none;
        }
        
        .tabs-panel-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
        }
        
        #close-tabs-panel {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s ease;
        }
        
        #close-tabs-panel:hover {
            background: rgba(255,255,255,0.2);
        }
        
        .tabs-panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }
        
        .draggable-tab {
            padding: 8px 12px;
            margin: 2px 0;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            cursor: grab;
            display: flex;
            align-items: center;
            transition: all 0.2s ease;
            position: relative;
        }
        
        .draggable-tab:hover {
            background: #e8f5e8;
            transform: translateX(4px);
            border-color: #28a745;
            box-shadow: 0 2px 8px rgba(40,167,69,0.2);
        }
        
        .draggable-tab:active {
            cursor: grabbing;
            transform: scale(0.98);
        }
        
        .draggable-tab img {
            margin-right: 8px;
            flex-shrink: 0;
        }
        
        .draggable-tab .tab-info {
            flex: 1;
            min-width: 0;
        }
        
        .draggable-tab .tab-title {
            font-size: 12px;
            font-weight: 500;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2px;
        }
        
        .draggable-tab .tab-url {
            font-size: 10px;
            color: #666;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .tab-active {
            border-color: #007acc;
            background: #e3f2fd;
        }
        
        .tab-active .tab-title {
            color: #007acc;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);

    // タブ要素作成
    const content = panel.querySelector('#tabs-panel-content');

    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = 'draggable-tab';
        tabEl.draggable = true;

        // アクティブタブのマーク
        if (tab.active) {
            tabEl.classList.add('tab-active');
        }

        tabEl.innerHTML = `
            <img src="${tab.favIconUrl || 'https://www.google.com/s2/favicons?domain=' + new URL(tab.url).hostname}" width="16" height="16">
            <div class="tab-info">
                <div class="tab-title" title="${tab.title || tab.url}">${tab.title || 'Untitled'}</div>
                <div class="tab-url" title="${tab.url}">${tab.url}</div>
            </div>
        `;

        // ドラッグイベント設定
        tabEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/uri-list', tab.url);
            e.dataTransfer.setData('text/plain', tab.title || 'Current Tab');
            e.dataTransfer.effectAllowed = 'copy';

            // ドラッグ中の視覚フィードバック
            tabEl.style.opacity = '0.5';
            console.log('[DEBUG] Dragging tab:', tab.title);
        });

        tabEl.addEventListener('dragend', (e) => {
            tabEl.style.opacity = '1';
        });

        content.appendChild(tabEl);
    });

    // パネル移動機能（既存のmakePanelDraggableを使用）
    makePanelDraggable(panel);

    // 閉じるボタン
    panel.querySelector('#close-tabs-panel').addEventListener('click', () => {
        document.body.removeChild(panel);
    });

    document.body.appendChild(panel);

    // 設定パネルを閉じる
    document.querySelector('#settings-panel').classList.add('hidden');

    // 成功メッセージ
    showSuccessMessage(`${tabs.length}個のタブを表示しました！ドラッグしてタイルを作成`);
}