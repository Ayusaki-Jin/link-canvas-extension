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

        console.log('[INFO] Saved data loaded successfully');
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // キーボードショートカット
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // ウィンドウリサイズ
    window.addEventListener('resize', handleWindowResize);

    console.log('[INFO] Event listeners set up');
}

// キーボードショートカット
function handleKeyboardShortcuts(e) {
    const modifier = e.ctrlKey || e.metaKey;

    switch (e.key) {
        case 'Delete':
            // 選択されたタイルを削除（実装は後で追加可能）
            break;

        case 's':
            if (modifier) {
                e.preventDefault();
                linkCanvas.saveData();
                showSuccessMessage('データを保存しました');
            }
            break;

        case 'Escape':
            if (contextMenu) {
                contextMenu.hide();
            }
            break;
    }
}

// ウィンドウリサイズ処理
function handleWindowResize() {
    const canvas = document.getElementById('link-canvas');
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
}

// ブックマークインポート
async function handleBookmarkImport() {
    try {
        const bookmarks = await chrome.bookmarks.getTree();
        // 簡単な実装 - 最初の10個のブックマークをインポート
        const flatBookmarksWithURLs = [];

        function extractBookmarks(nodes) {
            for (const node of nodes) {
                if (node.url) {
                    flatBookmarksWithURLs.push(node);
                    if (flatBookmarksWithURLs.length >= 10) break;
                }
                if (node.children) {
                    extractBookmarks(node.children);
                }
            }
        }

        extractBookmarks(bookmarks);

        // グリッド配置でタイル作成
        let x = 50, y = 50;
        for (const bookmark of flatBookmarksWithURLs) {
            linkCanvas.createLinkTile(bookmark.url, bookmark.title, { x, y });
            x += 60;
            if (x > window.innerWidth - 100) {
                x = 50;
                y += 60;
            }
        }

        showSuccessMessage(`${flatBookmarksWithURLs.length}個のブックマークをインポートしました`);

    } catch (error) {
        console.log('[ERROR] Failed to import bookmarks:', error);
        showErrorMessage('ブックマークの読み込みに失敗しました');
    }
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
