class LinkCanvas {
    constructor() {
        this.canvas = document.getElementById('link-canvas');
        this.gridSize = 50;
        this.tiles = new Map();
        this.groups = new Map();
        this.dragState = {
            isDragging: false,
            draggedTile: null,
            startPosition: null
        };
        this.dependencies = {};

        this.init();
    }

    async init() {
        console.log('[INIT] LinkCanvas initializing');

        this.setupCanvas();
        this.setupDragAndDrop();
        this.setupKeyboardEvents();

        console.log('[INFO] LinkCanvas initialization complete');
    }

    setDependencies(gridManager, storageManager, autoGrouping, colorManager, nameGenerator) {
        this.gridManager = gridManager;
        this.storageManager = storageManager;
        this.autoGrouping = autoGrouping;
        this.colorManager = colorManager;
        this.nameGenerator = nameGenerator;
    }

    setupCanvas() {
        this.canvas.style.position = 'relative';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.overflow = 'hidden';
    }

    setupDragAndDrop() {
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.handleDragOver(e);
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(e);
        });

        this.canvas.addEventListener('dragend', () => {
            this.clearDragState();
        });

        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'A') {
                console.log('[SCAN] Drag detected from bookmark');
            }
        });
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedTiles && this.selectedTiles.length > 0) {
                this.deleteSelectedTiles();
            }
        });
    }

    handleDragOver(e) {
        const position = this.snapToGrid(e.clientX, e.clientY);

        // ホバー中のタイル検知
        const hoveredTile = this.getTileAt(position.x, position.y);
        if (hoveredTile && this.dragState.draggedTile &&
            hoveredTile !== this.dragState.draggedTile) {
            if (this.autoGrouping) {
                this.autoGrouping.startHoverTimer(this.dragState.draggedTile, hoveredTile);
            }
        } else {
            if (this.autoGrouping) {
                this.autoGrouping.clearHoverTimer();
            }
        }

        this.showDropPreview(position);
    }

    handleDrop(e) {
        const position = this.snapToGrid(e.clientX, e.clientY);

        if (this.dragState.draggedTile) {
            // 既存タイルの移動
            const tile = this.dragState.draggedTile;

            if (tile.groupId) {
                // グループ内タイルの移動は特別処理
                this.moveGroupTile(tile, position);
            } else {
                // 単独タイルの移動
                tile.position = position;
                tile.element.style.left = position.x + 'px';
                tile.element.style.top = position.y + 'px';
            }

            console.log('[INFO] Tile moved to:', position);
        } else {
            // 新規タイル作成
            const url = e.dataTransfer.getData('text/uri-list') ||
                e.dataTransfer.getData('text/plain');
            const title = e.dataTransfer.getData('text/html') || 'New Link';

            if (url && url.startsWith('http')) {
                this.createLinkTile(url, this.extractTitle(title), position);
                console.log('[INFO] New tile created');
            }
        }

        this.clearDragState();
        this.hideDropPreview();
        this.saveData();
    }

    moveGroupTile(tile, newPosition) {
        const groupArea = this.groups.get(tile.groupId);
        if (!groupArea) return;

        // グループから除外して単独タイルにする
        groupArea.removeTile(tile);
        tile.groupId = null;

        // キャンバスに移動
        this.canvas.appendChild(tile.element);
        tile.position = newPosition;
        tile.element.style.left = newPosition.x + 'px';
        tile.element.style.top = newPosition.y + 'px';
        tile.element.style.width = this.gridSize + 'px';
        tile.element.style.height = this.gridSize + 'px';

        delete tile.relativePosition;

        // グループが空になったら削除
        if (groupArea.tiles.length === 0) {
            groupArea.element.remove();
            this.groups.delete(groupArea.id);
        }
    }

    snapToGrid(x, y) {
        return this.gridManager ? this.gridManager.snapToGrid(x, y) : { x, y };
    }

    getTileAt(x, y) {
        for (const tile of this.tiles.values()) {
            if (tile.position.x === x && tile.position.y === y && !tile.groupId) {
                return tile;
            }
        }
        return null;
    }

    // createLinkTileメソッドを以下に置換：

    createLinkTile(url, title, position) {
        const tileId = this.generateId();

        // 自動タイトル改善
        const improvedTitle = this.generateSmartTitle(url, title);

        const tile = {
            id: tileId,
            url: url,
            title: improvedTitle,
            position: position,
            groupId: null,
            element: null
        };

        tile.element = this.createTileElement(tile);
        this.canvas.appendChild(tile.element);
        this.tiles.set(tileId, tile);

        // アニメーション
        tile.element.classList.add('tile-adding');
        setTimeout(() => {
            tile.element.classList.remove('tile-adding');
        }, 300);

        this.saveData();
        return tile;
    }

    // 新しいメソッド：スマートタイトル生成
    generateSmartTitle(url, originalTitle) {
        try {
            // 元のタイトルが有効な場合はそのまま使用
            const cleanTitle = this.extractTitle(originalTitle);
            if (cleanTitle && cleanTitle !== 'New Link' && cleanTitle.length > 2) {
                return cleanTitle;
            }

            // URLからドメインを抽出
            const urlObj = new URL(url);
            const domain = urlObj.hostname.toLowerCase();
            const path = urlObj.pathname;

            // 人気サイトの辞書データ
            const siteTitles = {
                // 日本のサイト
                'youtube.com': 'YouTube',
                'www.youtube.com': 'YouTube',
                'm.youtube.com': 'YouTube',
                'twitter.com': 'Twitter',
                'x.com': 'X (Twitter)',
                'www.twitter.com': 'Twitter',
                'github.com': 'GitHub',
                'www.github.com': 'GitHub',
                'qiita.com': 'Qiita',
                'zenn.dev': 'Zenn',
                'note.com': 'note',
                'www.amazon.co.jp': 'Amazon',
                'amazon.co.jp': 'Amazon',
                'www.amazon.com': 'Amazon',
                'amazon.com': 'Amazon',
                'google.com': 'Google',
                'www.google.com': 'Google',
                'maps.google.com': 'Google Maps',
                'drive.google.com': 'Google Drive',
                'docs.google.com': 'Google Docs',
                'gmail.com': 'Gmail',
                'mail.google.com': 'Gmail',
                'facebook.com': 'Facebook',
                'www.facebook.com': 'Facebook',
                'instagram.com': 'Instagram',
                'www.instagram.com': 'Instagram',
                'linkedin.com': 'LinkedIn',
                'www.linkedin.com': 'LinkedIn',
                'reddit.com': 'Reddit',
                'www.reddit.com': 'Reddit',
                'stackoverflow.com': 'Stack Overflow',
                'stackexchange.com': 'Stack Exchange',
                'wikipedia.org': 'Wikipedia',
                'ja.wikipedia.org': 'Wikipedia',
                'en.wikipedia.org': 'Wikipedia',
                'www.wikipedia.org': 'Wikipedia',
                'microsoft.com': 'Microsoft',
                'www.microsoft.com': 'Microsoft',
                'office.com': 'Microsoft Office',
                'outlook.com': 'Outlook',
                'apple.com': 'Apple',
                'www.apple.com': 'Apple',
                'developer.apple.com': 'Apple Developer',
                'netflix.com': 'Netflix',
                'www.netflix.com': 'Netflix',
                'spotify.com': 'Spotify',
                'open.spotify.com': 'Spotify',
                'discord.com': 'Discord',
                'discordapp.com': 'Discord',
                'slack.com': 'Slack',
                'zoom.us': 'Zoom',
                'teams.microsoft.com': 'Microsoft Teams',
                'www.figma.com': 'Figma',
                'figma.com': 'Figma',
                'canva.com': 'Canva',
                'www.canva.com': 'Canva',
                'notion.so': 'Notion',
                'www.notion.so': 'Notion',
                'trello.com': 'Trello',
                'codepen.io': 'CodePen',
                'jsfiddle.net': 'JSFiddle',
                'replit.com': 'Replit',
                'codesandbox.io': 'CodeSandbox'
            };

            // 辞書にある場合
            if (siteTitles[domain]) {
                return siteTitles[domain];
            }

            // 特定パターンの処理
            if (domain.includes('github.com') && path.length > 1) {
                const parts = path.split('/').filter(p => p);
                if (parts.length >= 2) {
                    return `${parts[0]}/${parts[1]} - GitHub`;
                }
            }

            if (domain.includes('youtube.com') && path.includes('/watch')) {
                return 'YouTube動画';
            }

            if (domain.includes('wikipedia.org')) {
                return 'Wikipedia';
            }

            // ドメインからの推測タイトル生成
            const mainDomain = domain.replace('www.', '').split('.')[0];
            const capitalizedDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);

            return capitalizedDomain;

        } catch (error) {
            console.log('[DEBUG] Title generation failed, using fallback');
            return originalTitle || 'New Link';
        }
    }


    createTileElement(tile) {
        const element = document.createElement('div');
        element.className = 'link-tile';
        element.style.position = 'absolute';
        element.style.left = tile.position.x + 'px';
        element.style.top = tile.position.y + 'px';
        element.style.width = this.gridSize + 'px';
        element.style.height = this.gridSize + 'px';

        // ファビコン
        const favicon = document.createElement('img');
        favicon.className = 'favicon';
        favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(tile.url).hostname}`;
        favicon.draggable = false;
        favicon.style.pointerEvents = 'none';

        // タイトル
        const titleEl = document.createElement('div');
        titleEl.className = 'title';
        titleEl.textContent = tile.title;
        titleEl.style.userSelect = 'none';

        element.appendChild(favicon);
        element.appendChild(titleEl);

        this.setupTileEvents(element, tile);
        return element;
    }

    setupTileEvents(element, tile) {
        // クリックでページ開く
        element.addEventListener('click', (e) => {
            if (!this.dragState.isDragging) {
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+クリック：新規タブ
                    window.open(tile.url, '_blank');
                } else {
                    // 通常クリック：同一タブ
                    window.location.href = tile.url;
                }
            }
        });

        // ドラッグ開始
        element.draggable = true;
        element.addEventListener('dragstart', (e) => {
            this.dragState.isDragging = true;
            this.dragState.draggedTile = tile;
            this.dragState.startPosition = { ...tile.position };

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');

            element.classList.add('dragging');
            console.log('[SCAN] Tile drag started');
        });

        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            this.clearDragState();
        });

        // 右クリック
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (window.contextMenu) {
                window.contextMenu.showForTile(e, tile);
            }
        });
    }

    showDropPreview(position) {
        let preview = document.getElementById('drop-preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'drop-preview';
            preview.className = 'drop-preview';
            this.canvas.appendChild(preview);
        }

        preview.style.left = position.x + 'px';
        preview.style.top = position.y + 'px';
        preview.style.display = 'block';
    }

    // hideDropPreviewメソッドを以下に置換：

    hideDropPreview() {
        const preview = document.getElementById('drop-preview');
        if (preview) {
            preview.style.display = 'none';
            preview.remove(); // 完全に削除
            console.log('[DEBUG] Drop preview removed');
        }

        // 全ての破線プレビューを削除（念のため）
        const allPreviews = document.querySelectorAll('.drop-preview');
        allPreviews.forEach(p => p.remove());
    }


    // 既存のclearDragStateメソッドを以下に置換：

    clearDragState() {
        this.dragState.isDragging = false;
        this.dragState.draggedTile = null;
        this.dragState.startPosition = null;

        // ドロップ位置プレビューを確実に削除
        this.hideDropPreview();

        // ホバータイマーもクリア
        if (this.autoGrouping) {
            this.autoGrouping.clearHoverTimer();
        }

        console.log('[DEBUG] Drag state completely cleared');
    }


    extractTitle(titleData) {
        if (typeof titleData === 'string' && titleData.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = titleData;
            return tempDiv.textContent || tempDiv.innerText || 'New Link';
        }
        return titleData || 'New Link';
    }

    generateId() {
        return 'tile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async saveData() {
        if (this.storageManager) {
            return await this.storageManager.saveData(this.tiles, this.groups, {
                gridSize: this.gridSize
            });
        }
        return false;
    }

    async loadFromData(data) {
        if (!data || !data.tiles || !data.groups) return;

        this.clearAll();

        // タイル復元
        for (const tileData of data.tiles) {
            const tile = { ...tileData };
            tile.element = this.createTileElement(tile);
            this.tiles.set(tile.id, tile);

            if (!tile.groupId) {
                this.canvas.appendChild(tile.element);
            }
        }

        // グループ復元
        for (const groupData of data.groups) {
            const groupArea = new GroupArea(
                groupData.id,
                groupData.color,
                groupData.name,
                groupData.position,
                groupData.size
            );

            groupArea.isExpanded = groupData.isExpanded;

            // グループ内タイルを関連付け
            for (const tileId of groupData.tileIds) {
                const tile = this.tiles.get(tileId);
                if (tile) {
                    groupArea.addTile(tile);
                }
            }

            this.groups.set(groupData.id, groupArea);
            this.canvas.appendChild(groupArea.element);
        }
    }

    clearAll() {
        // 全タイル削除
        for (const tile of this.tiles.values()) {
            if (tile.element && tile.element.parentNode) {
                tile.element.parentNode.removeChild(tile.element);
            }
        }
        this.tiles.clear();

        // 全グループ削除
        for (const group of this.groups.values()) {
            if (group.element && group.element.parentNode) {
                group.element.parentNode.removeChild(group.element);
            }
        }
        this.groups.clear();
    }
}
