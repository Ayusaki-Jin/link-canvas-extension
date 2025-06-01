class StorageManager {
    constructor() {
        this.storageKey = 'linkCanvasData';
        this.backupKey = 'linkCanvasBackup';
        this.settingsKey = 'linkCanvasSettings';
        this.maxBackups = 5;

        this.init();
    }

    init() {
        console.log('[INIT] StorageManager initialized');
        this.setupStorageListeners();
    }

    setupStorageListeners() {
        // ストレージ変更の監視
        if (chrome && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'sync' && changes[this.storageKey]) {
                    console.log('[INFO] Storage data changed externally');
                    // 必要に応じて再読み込み処理
                }
            });
        }
    }

    async saveData(tiles, groups, settings = {}) {
        try {
            const data = {
                version: '1.0.0',
                timestamp: Date.now(),
                tiles: this.serializeTiles(tiles),
                groups: this.serializeGroups(groups),
                settings: settings,
                metadata: {
                    totalTiles: tiles.size,
                    totalGroups: groups.size,
                    lastModified: new Date().toISOString()
                }
            };

            // メインデータ保存
            await chrome.storage.sync.set({ [this.storageKey]: data });

            // バックアップ作成
            await this.createBackup(data);

            console.log('[INFO] Data saved successfully:', data.metadata);
            return true;

        } catch (error) {
            console.log('[ERROR] Failed to save data:', error);

            // 同期ストレージが満杯の場合はローカルストレージにフォールバック
            if (error.message.includes('QUOTA_BYTES_PER_ITEM')) {
                return await this.saveToLocal(tiles, groups, settings);
            }

            return false;
        }
    }

    async loadData() {
        try {
            // まず同期ストレージから試行
            const syncResult = await chrome.storage.sync.get([this.storageKey]);
            if (syncResult[this.storageKey]) {
                const data = syncResult[this.storageKey];
                console.log('[INFO] Data loaded from sync storage:', data.metadata);
                return this.deserializeData(data);
            }

            // 同期ストレージにない場合はローカルストレージを確認
            const localResult = await chrome.storage.local.get([this.storageKey]);
            if (localResult[this.storageKey]) {
                const data = localResult[this.storageKey];
                console.log('[INFO] Data loaded from local storage:', data.metadata);
                return this.deserializeData(data);
            }

            console.log('[INFO] No saved data found');
            return null;

        } catch (error) {
            console.log('[ERROR] Failed to load data:', error);
            return null;
        }
    }

    serializeTiles(tilesMap) {
        const serialized = [];
        for (const [id, tile] of tilesMap) {
            serialized.push({
                id: tile.id,
                url: tile.url,
                title: tile.title,
                position: tile.position,
                groupId: tile.groupId || null,
                relativePosition: tile.relativePosition || null,
                favicon: tile.favicon || null,
                createdAt: tile.createdAt || Date.now()
            });
        }
        return serialized;
    }

    serializeGroups(groupsMap) {
        const serialized = [];
        for (const [id, group] of groupsMap) {
            serialized.push({
                id: group.id,
                color: group.color,
                name: group.name,
                position: group.position,
                size: group.size,
                isExpanded: group.isExpanded,
                showName: group.showName,
                tileIds: group.tiles.map(tile => tile.id),
                createdAt: group.createdAt || Date.now()
            });
        }
        return serialized;
    }

    deserializeData(data) {
        if (!data || !data.tiles || !data.groups) {
            console.log('[ERROR] Invalid data format');
            return null;
        }

        return {
            tiles: data.tiles,
            groups: data.groups,
            settings: data.settings || {},
            metadata: data.metadata || {},
            version: data.version || '1.0.0'
        };
    }

    async saveToLocal(tiles, groups, settings) {
        try {
            const data = {
                version: '1.0.0',
                timestamp: Date.now(),
                tiles: this.serializeTiles(tiles),
                groups: this.serializeGroups(groups),
                settings: settings,
                storageType: 'local'
            };

            await chrome.storage.local.set({ [this.storageKey]: data });
            console.log('[INFO] Data saved to local storage');
            return true;

        } catch (error) {
            console.log('[ERROR] Failed to save to local storage:', error);
            return false;
        }
    }

    async createBackup(data) {
        try {
            const backups = await this.getBackups();

            // 新しいバックアップを追加
            backups.unshift({
                ...data,
                backupId: 'backup_' + Date.now(),
                originalTimestamp: data.timestamp
            });

            // 最大数を超えたら古いものを削除
            if (backups.length > this.maxBackups) {
                backups.splice(this.maxBackups);
            }

            await chrome.storage.local.set({ [this.backupKey]: backups });
            console.log('[INFO] Backup created, total backups:', backups.length);

        } catch (error) {
            console.log('[ERROR] Failed to create backup:', error);
        }
    }

    async getBackups() {
        try {
            const result = await chrome.storage.local.get([this.backupKey]);
            return result[this.backupKey] || [];
        } catch (error) {
            console.log('[ERROR] Failed to get backups:', error);
            return [];
        }
    }

    async restoreFromBackup(backupId) {
        try {
            const backups = await this.getBackups();
            const backup = backups.find(b => b.backupId === backupId);

            if (!backup) {
                console.log('[ERROR] Backup not found:', backupId);
                return false;
            }

            // 現在のデータをバックアップしてから復元
            const currentData = await this.loadData();
            if (currentData) {
                await this.createBackup(currentData);
            }

            // バックアップデータを復元
            await chrome.storage.sync.set({ [this.storageKey]: backup });
            console.log('[INFO] Data restored from backup:', backupId);
            return true;

        } catch (error) {
            console.log('[ERROR] Failed to restore from backup:', error);
            return false;
        }
    }

    async exportData() {
        try {
            const data = await this.loadData();
            if (!data) {
                throw new Error('No data to export');
            }

            const exportData = {
                ...data,
                exportedAt: new Date().toISOString(),
                appName: 'Link Canvas',
                exportVersion: '1.0.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `link-canvas-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('[INFO] Data exported successfully');
            return true;

        } catch (error) {
            console.log('[ERROR] Failed to export data:', error);
            return false;
        }
    }

    async importData(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            // データ形式の検証
            if (!this.validateImportData(importData)) {
                throw new Error('Invalid import data format');
            }

            // 現在のデータをバックアップ
            const currentData = await this.loadData();
            if (currentData) {
                await this.createBackup(currentData);
            }

            // インポートデータを保存
            await chrome.storage.sync.set({ [this.storageKey]: importData });
            console.log('[INFO] Data imported successfully');
            return true;

        } catch (error) {
            console.log('[ERROR] Failed to import data:', error);
            return false;
        }
    }

    validateImportData(data) {
        // 基本構造の確認
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.tiles) || !Array.isArray(data.groups)) return false;

        // タイルデータの確認
        for (const tile of data.tiles) {
            if (!tile.id || !tile.url || !tile.position) return false;
            if (typeof tile.position.x !== 'number' || typeof tile.position.y !== 'number') return false;
        }

        // グループデータの確認
        for (const group of data.groups) {
            if (!group.id || !group.color || !group.position || !group.size) return false;
            if (!Array.isArray(group.tileIds)) return false;
        }

        return true;
    }

    async clearAllData() {
        try {
            await chrome.storage.sync.remove([this.storageKey]);
            await chrome.storage.local.remove([this.storageKey, this.backupKey]);
            console.log('[INFO] All data cleared');
            return true;
        } catch (error) {
            console.log('[ERROR] Failed to clear data:', error);
            return false;
        }
    }

    async getStorageUsage() {
        try {
            const syncUsage = await chrome.storage.sync.getBytesInUse();
            const localUsage = await chrome.storage.local.getBytesInUse();

            return {
                sync: {
                    used: syncUsage,
                    quota: chrome.storage.sync.QUOTA_BYTES || 102400,
                    percentage: (syncUsage / (chrome.storage.sync.QUOTA_BYTES || 102400)) * 100
                },
                local: {
                    used: localUsage,
                    quota: chrome.storage.local.QUOTA_BYTES || 5242880
                }
            };
        } catch (error) {
            console.log('[ERROR] Failed to get storage usage:', error);
            return null;
        }
    }
}
  