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
// js/main.js の handleBookmarkImport を置換
async function handleBookmarkImport() {
    try {
        const bookmarks = await chrome.bookmarks.getTree();
        const importDialog = createBookmarkImportDialog(bookmarks);
        document.body.appendChild(importDialog);

    } catch (error) {
        console.log('[ERROR] Failed to import bookmarks:', error);
        showErrorMessage('ブックマークの読み込みに失敗しました');
    }
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
