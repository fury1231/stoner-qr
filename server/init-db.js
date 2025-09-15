const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 初始化資料庫
db.serialize(() => {
    // 創建抽獎券資料表
    db.run(`
        CREATE TABLE IF NOT EXISTS lottery_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            serial_number TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            spot_id TEXT NOT NULL,
            status TEXT CHECK(status IN ('issued', 'redeemed')) DEFAULT 'issued',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            redeemed_at DATETIME NULL,
            UNIQUE(user_id, spot_id)
        )
    `);

    // 創建地點配置表
    db.run(`
        CREATE TABLE IF NOT EXISTS spots (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT 1
        )
    `);

    // 創建管理員帳號表
    db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 生成14位英數混合隨機地點ID
    function generateSpotId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 14; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 插入預設地點（使用隨機生成的ID）
    const defaultSpots = [
        { name: '神秘地點 A', description: '第一個尋寶地點' },
        { name: '神秘地點 B', description: '第二個尋寶地點' },
        { name: '神秘地點 C', description: '第三個尋寶地點' },
        { name: '神秘地點 D', description: '第四個尋寶地點' },
        { name: '神秘地點 E', description: '第五個尋寶地點' }
    ];

    // 檢查是否已有地點，如果沒有則插入預設地點
    db.get('SELECT COUNT(*) as count FROM spots', (err, result) => {
        if (err) {
            console.error('檢查地點數量時發生錯誤:', err);
            return;
        }

        if (result.count === 0) {
            console.log('插入預設地點...');
            defaultSpots.forEach(spot => {
                const spotId = generateSpotId();
                db.run('INSERT INTO spots (id, name, description) VALUES (?, ?, ?)',
                    [spotId, spot.name, spot.description],
                    function(err) {
                        if (err) {
                            console.error('插入地點失敗:', err);
                        } else {
                            console.log(`已新增地點: ${spot.name} (ID: ${spotId})`);
                        }
                    }
                );
            });
        } else {
            console.log(`資料庫中已有 ${result.count} 個地點`);
        }
    });

    // 創建預設管理員帳號 (username: admin, password: stoner)
    const saltRounds = 10;
    const adminPassword = bcrypt.hashSync('stoner', saltRounds);

    db.run(
        'INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES (?, ?)',
        ['admin', adminPassword],
        function(err) {
            if (err) {
                console.error('Error creating admin user:', err);
            } else {
                console.log('預設管理員帳號已創建: admin/stoner');
            }
        }
    );

    console.log('資料庫初始化完成');
    console.log('資料庫位置:', dbPath);
    console.log('已建立資料表: lottery_tickets, spots, admin_users');
    console.log('已插入預設尋寶地點和管理員帳號');
});

db.close((err) => {
    if (err) {
        console.error('關閉資料庫時發生錯誤:', err.message);
    } else {
        console.log('資料庫連接已關閉');
    }
});