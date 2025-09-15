const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const port = process.env.PORT || 4500;

// 中介軟體設定
app.use(cors({
    origin: 'http://localhost:4500',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Session 設定
app.use(session({
    secret: 'qrcode-treasure-hunt-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24小時
}));

// 資料庫連接
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 生成唯一序號
function generateSerialNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TH${timestamp}${random}`;
}

// 生成14位英數混合隨機地點ID
function generateSpotId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 14; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 驗證電子郵件格式
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 驗證是否為有效的地點ID
function validateSpotId(spotId, callback) {
    db.get('SELECT id FROM spots WHERE id = ? AND is_active = 1', [spotId], callback);
}

// 10. 驗證地點ID並取得地點資訊 (公開API)
app.get('/api/spot/:spot_id', (req, res) => {
    const spotId = req.params.spot_id;

    if (!spotId) {
        return res.status(400).json({
            success: false,
            message: '缺少地點ID'
        });
    }

    db.get('SELECT id, name FROM spots WHERE id = ? AND is_active = 1', [spotId], (err, spot) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: '系統錯誤'
            });
        }

        if (!spot) {
            return res.status(404).json({
                success: false,
                message: '無效的地點ID'
            });
        }

        res.json({
            success: true,
            data: {
                spot_id: spot.id,
                spot_name: spot.name
            }
        });
    });
});

// API 路由

// 1. 顧客領取抽獎資格 (FR-C1)
app.post('/api/claim-ticket', (req, res) => {
    const { spot_id, email } = req.body;

    // 驗證輸入
    if (!spot_id || !email) {
        return res.status(400).json({
            success: false,
            message: '請提供地點ID和電子郵件'
        });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({
            success: false,
            message: '請輸入正確的電子郵件格式 (example@email.com)'
        });
    }

    // 檢查地點是否有效
    validateSpotId(spot_id, (err, spot) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: '系統錯誤，請稍後再試'
            });
        }

        if (!spot) {
            return res.status(400).json({
                success: false,
                message: '無效的地點ID'
            });
        }

        // 檢查是否已經在任何地點領取過
        db.get(
            'SELECT lt.id, lt.spot_id, s.name as spot_name FROM lottery_tickets lt LEFT JOIN spots s ON lt.spot_id = s.id WHERE lt.user_id = ?',
            [email],
            (err, existingTicket) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: '系統錯誤，請稍後再試'
                    });
                }

                if (existingTicket) {
                    const previousSpotName = existingTicket.spot_name || existingTicket.spot_id;
                    return res.status(409).json({
                        success: false,
                        message: `您已在「${previousSpotName}」領取過抽獎資格囉！一人只能兌換一次獎勵。`
                    });
                }

                // 創建新的抽獎券
                const serialNumber = generateSerialNumber();
                db.run(
                    'INSERT INTO lottery_tickets (serial_number, user_id, spot_id) VALUES (?, ?, ?)',
                    [serialNumber, email, spot_id],
                    function(err) {
                        if (err) {
                            return res.status(500).json({
                                success: false,
                                message: '系統忙碌中，請稍後再試'
                            });
                        }

                        // 取得地點名稱
                        db.get('SELECT name FROM spots WHERE id = ?', [spot_id], (err, spotInfo) => {
                            const spotName = spotInfo ? spotInfo.name : spot_id;
                            res.json({
                                success: true,
                                message: `恭喜！您已成功在 ${spotName} 踩點！請憑電子郵件 ${email} 至店裡兌換抽獎機會。`,
                                data: {
                                    serial_number: serialNumber,
                                    spot_name: spotName,
                                    email: email
                                }
                            });
                        });
                    }
                );
            }
        );
    });
});

// 2. 管理員登入
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: '請提供使用者名稱和密碼'
        });
    }

    db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: '系統錯誤'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '使用者名稱或密碼錯誤'
            });
        }

        bcrypt.compare(password, user.password_hash, (err, match) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '系統錯誤'
                });
            }

            if (!match) {
                return res.status(401).json({
                    success: false,
                    message: '使用者名稱或密碼錯誤'
                });
            }

            req.session.adminId = user.id;
            req.session.username = user.username;
            res.json({
                success: true,
                message: '登入成功'
            });
        });
    });
});

// 3. 管理員登出
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: '登出失敗'
            });
        }
        res.json({
            success: true,
            message: '已成功登出'
        });
    });
});

// 管理員身份驗證中介軟體
function requireAdmin(req, res, next) {
    if (!req.session.adminId) {
        return res.status(401).json({
            success: false,
            message: '需要管理員權限'
        });
    }
    next();
}

// 4. 查詢顧客的抽獎資格 (FR-C2)
app.get('/api/admin/tickets/:email', requireAdmin, (req, res) => {
    const email = req.params.email;
    const showAll = req.query.show_all === 'true'; // 查詢參數決定是否顯示所有狀態

    if (!validateEmail(email)) {
        return res.status(400).json({
            success: false,
            message: '請輸入正確的電子郵件格式'
        });
    }

    let query = `
        SELECT lt.*, s.name as spot_name
        FROM lottery_tickets lt
        LEFT JOIN spots s ON lt.spot_id = s.id
        WHERE lt.user_id = ?
    `;

    // 如果不是顯示全部，則只顯示可兌換的
    if (!showAll) {
        query += ` AND lt.status = 'issued'`;
    }

    query += ` ORDER BY lt.created_at DESC`;

    db.all(query, [email], (err, tickets) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: '查詢失敗'
            });
        }

        // 如果不是顯示全部，且沒有可兌換的票券，則查詢已兌換的票券
        if (!showAll && tickets.length === 0) {
            const redeemedQuery = `
                SELECT lt.*, s.name as spot_name
                FROM lottery_tickets lt
                LEFT JOIN spots s ON lt.spot_id = s.id
                WHERE lt.user_id = ? AND lt.status = 'redeemed'
                ORDER BY lt.redeemed_at DESC
            `;

            db.all(redeemedQuery, [email], (err2, redeemedTickets) => {
                if (err2) {
                    return res.status(500).json({
                        success: false,
                        message: '查詢失敗'
                    });
                }

                res.json({
                    success: true,
                    data: tickets, // 空數組
                    redeemedTickets: redeemedTickets, // 已兌換的票券
                    showAll: showAll
                });
            });
        } else {
            res.json({
                success: true,
                data: tickets,
                showAll: showAll
            });
        }
    });
});

// 5. 核銷抽獎資格 (FR-C3) - 方案A：每個email只能核銷一次
app.put('/api/admin/redeem/:ticket_id', requireAdmin, (req, res) => {
    const ticketId = req.params.ticket_id;

    // 先查詢這張票券的詳細資訊
    db.get(
        'SELECT * FROM lottery_tickets WHERE id = ? AND status = ?',
        [ticketId, 'issued'],
        (err, ticket) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '系統錯誤'
                });
            }

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: '找不到可核銷的抽獎券'
                });
            }

            // 檢查該email是否已經有過核銷紀錄
            db.get(
                'SELECT COUNT(*) as count FROM lottery_tickets WHERE user_id = ? AND status = ?',
                [ticket.user_id, 'redeemed'],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: '系統錯誤'
                        });
                    }

                    if (result.count > 0) {
                        return res.status(409).json({
                            success: false,
                            message: '此電子郵件已經兌換過抽獎機會，每個email只能兌換一次'
                        });
                    }

                    // 如果該email沒有核銷過，執行核銷
                    db.run(
                        'UPDATE lottery_tickets SET status = ?, redeemed_at = CURRENT_TIMESTAMP WHERE id = ?',
                        ['redeemed', ticketId],
                        function(err) {
                            if (err) {
                                return res.status(500).json({
                                    success: false,
                                    message: '核銷失敗'
                                });
                            }

                            res.json({
                                success: true,
                                message: '核銷成功'
                            });
                        }
                    );
                }
            );
        }
    );
});

// 6. 新增地點 (管理功能)
app.post('/api/admin/spots', requireAdmin, (req, res) => {
    const { spot_name } = req.body;

    // 驗證輸入
    if (!spot_name) {
        return res.status(400).json({
            success: false,
            message: '請提供地點名稱'
        });
    }

    // 生成唯一的地點ID
    function tryCreateSpot(attempts = 0) {
        if (attempts >= 10) {
            return res.status(500).json({
                success: false,
                message: '生成唯一地點ID失敗，請稍後重試'
            });
        }

        const spot_id = generateSpotId();

        // 檢查地點ID是否已存在
        db.get('SELECT id FROM spots WHERE id = ?', [spot_id], (err, existingSpot) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '系統錯誤'
                });
            }

            if (existingSpot) {
                // ID已存在，重新生成
                tryCreateSpot(attempts + 1);
                return;
            }

            // 新增地點（不包含描述）
            db.run(
                'INSERT INTO spots (id, name, is_active) VALUES (?, ?, 1)',
                [spot_id, spot_name],
                function(err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: '新增地點失敗'
                        });
                    }

                    res.json({
                        success: true,
                        message: '地點新增成功',
                        data: {
                            spot_id: spot_id,
                            spot_name: spot_name,
                            qr_url: `${req.protocol}://${req.get('host')}/?spot_id=${spot_id}`
                        }
                    });
                }
            );
        });
    }

    tryCreateSpot();
});

// 7. 重置email狀態 (管理功能)
app.put('/api/admin/reset-email/:email', requireAdmin, (req, res) => {
    const email = req.params.email;

    if (!validateEmail(email)) {
        return res.status(400).json({
            success: false,
            message: '請輸入正確的電子郵件格式'
        });
    }

    // 檢查該email是否有任何紀錄
    db.get(
        'SELECT COUNT(*) as total FROM lottery_tickets WHERE user_id = ?',
        [email],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '系統錯誤'
                });
            }

            if (result.total === 0) {
                return res.status(404).json({
                    success: false,
                    message: '查無此電子郵件的紀錄'
                });
            }

            // 將該email的所有已核銷紀錄改回issued狀態
            db.run(
                'UPDATE lottery_tickets SET status = ?, redeemed_at = NULL WHERE user_id = ? AND status = ?',
                ['issued', email, 'redeemed'],
                function(err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: '重置失敗'
                        });
                    }

                    res.json({
                        success: true,
                        message: `已成功重置 ${email} 的兌換狀態，該email可以重新兌換抽獎機會`,
                        resetCount: this.changes
                    });
                }
            );
        }
    );
});

// 8. 刪除特定核銷資格 (管理功能)
app.delete('/api/admin/tickets/:ticket_id', requireAdmin, (req, res) => {
    const ticketId = req.params.ticket_id;

    // 先查詢這張票券是否存在
    db.get(
        'SELECT * FROM lottery_tickets WHERE id = ?',
        [ticketId],
        (err, ticket) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '系統錯誤'
                });
            }

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: '找不到指定的抽獎券'
                });
            }

            // 刪除票券
            db.run(
                'DELETE FROM lottery_tickets WHERE id = ?',
                [ticketId],
                function(err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: '刪除失敗'
                        });
                    }

                    res.json({
                        success: true,
                        message: '抽獎資格已成功刪除',
                        deletedTicket: {
                            id: ticket.id,
                            serial_number: ticket.serial_number,
                            user_id: ticket.user_id,
                            spot_id: ticket.spot_id,
                            status: ticket.status
                        }
                    });
                }
            );
        }
    );
});

// 9. 刪除地點 (管理功能)
app.delete('/api/admin/spots/:spot_id', requireAdmin, (req, res) => {
    const spotId = req.params.spot_id;

    if (!spotId) {
        return res.status(400).json({
            success: false,
            message: '請提供地點ID'
        });
    }

    // 先查詢地點是否存在
    db.get('SELECT * FROM spots WHERE id = ?', [spotId], (err, spot) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: '系統錯誤'
            });
        }

        if (!spot) {
            return res.status(404).json({
                success: false,
                message: '找不到指定的地點'
            });
        }

        // 檢查是否有相關的抽獎券記錄
        db.get('SELECT COUNT(*) as count FROM lottery_tickets WHERE spot_id = ?', [spotId], (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '系統錯誤'
                });
            }

            const ticketCount = result.count;

            // 刪除地點
            db.run('DELETE FROM spots WHERE id = ?', [spotId], function(err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: '刪除地點失敗'
                    });
                }

                res.json({
                    success: true,
                    message: `地點「${spot.name}」已成功刪除`,
                    data: {
                        deleted_spot: {
                            id: spot.id,
                            name: spot.name
                        },
                        affected_tickets: ticketCount
                    }
                });
            });
        });
    });
});

// 10. 取得所有地點列表 (管理功能)
app.get('/api/admin/spots', requireAdmin, (req, res) => {
    db.all('SELECT * FROM spots ORDER BY id', (err, spots) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: '查詢地點失敗'
            });
        }

        res.json({
            success: true,
            data: spots
        });
    });
});

// QR Code 生成 API
app.get('/api/qrcode/:spot_id', requireAdmin, async (req, res) => {
    const spotId = req.params.spot_id;
    const size = parseInt(req.query.size) || 300; // 預設大小 300px

    if (!spotId) {
        return res.status(400).json({
            success: false,
            message: '請提供地點ID'
        });
    }

    try {
        // 驗證地點是否存在
        db.get('SELECT * FROM spots WHERE id = ?', [spotId], async (err, spot) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '系統錯誤'
                });
            }

            if (!spot) {
                return res.status(404).json({
                    success: false,
                    message: '地點不存在'
                });
            }

            try {
                const qrUrl = `${req.protocol}://${req.get('host')}/?spot_id=${spotId}`;

                // 生成 QR Code (base64 圖片)
                const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
                    width: size,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                });

                res.json({
                    success: true,
                    data: {
                        spot_id: spotId,
                        spot_name: spot.name,
                        qr_url: qrUrl,
                        qr_image: qrCodeDataURL,
                        size: size
                    }
                });

            } catch (qrError) {
                console.error('QR Code 生成錯誤:', qrError);
                res.status(500).json({
                    success: false,
                    message: 'QR Code 生成失敗'
                });
            }
        });

    } catch (error) {
        console.error('QR Code API 錯誤:', error);
        res.status(500).json({
            success: false,
            message: '系統錯誤'
        });
    }
});

// 靜態頁面路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html'));
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`伺服器運行在 http://localhost:${port}`);
    console.log('管理後台: http://localhost:' + port + '/admin');
    console.log('預設管理員帳號: admin / stoner');
});