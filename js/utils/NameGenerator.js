class NameGenerator {
    constructor() {
        this.groupCounter = 1;
        this.usedNames = new Set();

        // 日本語グループ名のバリエーション
        this.nameTemplates = [
            'グループ {number}',
            'フォルダ {number}',
            'カテゴリ {number}',
            'セクション {number}'
        ];

        // テーマ別名前セット
        this.themeNames = {
            work: ['仕事', 'プロジェクト', 'タスク', '会議', 'ドキュメント'],
            study: ['勉強', '学習', '資料', 'メモ', '参考'],
            entertainment: ['エンタメ', '動画', '音楽', 'ゲーム', '趣味'],
            news: ['ニュース', '情報', '更新', 'トピック', '記事'],
            shopping: ['ショッピング', '買い物', '商品', 'セール', '注文'],
            social: ['SNS', 'ソーシャル', 'フレンド', 'コミュニティ', '交流'],
            tools: ['ツール', 'ユーティリティ', 'アプリ', 'サービス', 'システム']
        };
    }

    generateGroupName() {
        // 基本的な番号付きグループ名
        let name;
        do {
            name = `グループ ${this.groupCounter}`;
            this.groupCounter++;
        } while (this.usedNames.has(name));

        this.usedNames.add(name);
        console.log('[INFO] Group name generated:', name);
        return name;
    }

    generateSmartGroupName(tiles) {
        // タイルのURLから適切な名前を推測
        if (!tiles || tiles.length === 0) {
            return this.generateGroupName();
        }

        const domains = tiles.map(tile => {
            try {
                return new URL(tile.url).hostname.toLowerCase();
            } catch {
                return '';
            }
        }).filter(domain => domain);

        // 共通ドメインがある場合
        const commonDomain = this.findCommonDomain(domains);
        if (commonDomain) {
            const siteName = this.getDomainDisplayName(commonDomain);
            return this.ensureUniqueName(siteName);
        }

        // カテゴリ推測
        const category = this.inferCategory(domains);
        if (category) {
            const categoryName = this.themeNames[category];
            if (categoryName && categoryName.length > 0) {
                const randomName = categoryName[Math.floor(Math.random() * categoryName.length)];
                return this.ensureUniqueName(randomName);
            }
        }

        // デフォルト
        return this.generateGroupName();
    }

    findCommonDomain(domains) {
        if (domains.length === 0) return null;

        // 完全一致チェック
        const firstDomain = domains[0];
        if (domains.every(domain => domain === firstDomain)) {
            return firstDomain;
        }

        // 共通の親ドメインチェック
        const firstParts = firstDomain.split('.');
        if (firstParts.length >= 2) {
            const parentDomain = firstParts.slice(-2).join('.');
            if (domains.every(domain => domain.includes(parentDomain))) {
                return parentDomain;
            }
        }

        return null;
    }

    getDomainDisplayName(domain) {
        const displayNames = {
            'youtube.com': 'YouTube',
            'twitter.com': 'Twitter',
            'x.com': 'X',
            'facebook.com': 'Facebook',
            'instagram.com': 'Instagram',
            'linkedin.com': 'LinkedIn',
            'github.com': 'GitHub',
            'stackoverflow.com': 'Stack Overflow',
            'reddit.com': 'Reddit',
            'amazon.co.jp': 'Amazon',
            'amazon.com': 'Amazon',
            'google.com': 'Google',
            'microsoft.com': 'Microsoft',
            'apple.com': 'Apple',
            'yahoo.co.jp': 'Yahoo',
            'yahoo.com': 'Yahoo',
            'wikipedia.org': 'Wikipedia',
            'qiita.com': 'Qiita',
            'zenn.dev': 'Zenn',
            'note.com': 'note'
        };

        return displayNames[domain] || this.formatDomainName(domain);
    }

    formatDomainName(domain) {
        // ドメイン名を読みやすい形式に変換
        const parts = domain.split('.');
        const mainPart = parts[0];

        // 先頭を大文字に
        return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
    }

    inferCategory(domains) {
        const categoryPatterns = {
            work: ['slack', 'teams', 'zoom', 'notion', 'trello', 'asana', 'office', 'docs', 'sheets'],
            study: ['udemy', 'coursera', 'khan', 'wikipedia', 'qiita', 'zenn', 'stackoverflow'],
            entertainment: ['youtube', 'netflix', 'spotify', 'twitch', 'steam', 'game'],
            news: ['news', 'nhk', 'cnn', 'bbc', 'reuters', 'nikkei', 'asahi'],
            shopping: ['amazon', 'rakuten', 'yahoo', 'shop', 'store', 'buy', 'cart'],
            social: ['twitter', 'facebook', 'instagram', 'linkedin', 'discord', 'reddit'],
            tools: ['github', 'codepen', 'figma', 'canva', 'tools', 'app']
        };

        for (const [category, patterns] of Object.entries(categoryPatterns)) {
            for (const domain of domains) {
                if (patterns.some(pattern => domain.includes(pattern))) {
                    return category;
                }
            }
        }

        return null;
    }

    ensureUniqueName(baseName) {
        if (!this.usedNames.has(baseName)) {
            this.usedNames.add(baseName);
            return baseName;
        }

        let counter = 2;
        let uniqueName;
        do {
            uniqueName = `${baseName} ${counter}`;
            counter++;
        } while (this.usedNames.has(uniqueName));

        this.usedNames.add(uniqueName);
        return uniqueName;
    }

    releaseName(name) {
        this.usedNames.delete(name);
        console.log('[INFO] Group name released:', name);
    }

    // カスタム名前テンプレート追加
    addNameTemplate(template) {
        if (template.includes('{number}')) {
            this.nameTemplates.push(template);
            console.log('[INFO] Name template added:', template);
        }
    }

    // 使用済み名前を復元（データロード時）
    restoreUsedNames(namesArray) {
        this.usedNames.clear();
        namesArray.forEach(name => {
            this.usedNames.add(name);

            // カウンタも更新
            const match = name.match(/グループ (\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                this.groupCounter = Math.max(this.groupCounter, num + 1);
            }
        });
        console.log('[INFO] Used names restored:', this.usedNames.size);
    }

    reset() {
        this.usedNames.clear();
        this.groupCounter = 1;
        console.log('[INFO] NameGenerator reset');
    }
}
  