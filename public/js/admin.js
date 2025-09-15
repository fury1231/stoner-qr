// DOM 元素
const elements = {
    // 登入頁面
    loginPage: document.getElementById('login-page'),
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    loginBtn: document.getElementById('login-btn'),
    loginError: document.getElementById('login-error'),
    loginErrorText: document.getElementById('login-error-text'),

    // 主管理頁面
    adminPage: document.getElementById('admin-page'),
    adminUsername: document.getElementById('admin-username'),
    logoutBtn: document.getElementById('logout-btn'),

    // 搜尋功能
    searchEmail: document.getElementById('search-email'),
    searchBtn: document.getElementById('search-btn'),
    showAllTickets: document.getElementById('show-all-tickets'),

    // 結果顯示
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessageText: document.getElementById('error-message-text'),
    noResults: document.getElementById('no-results'),
    resultsList: document.getElementById('results-list'),
    resultsTitle: document.getElementById('results-title'),
    resultsCount: document.getElementById('results-count'),
    ticketsList: document.getElementById('tickets-list'),

    // 確認核銷對話框
    confirmModal: document.getElementById('confirm-modal'),
    modalSpotName: document.getElementById('modal-spot-name'),
    modalCreatedTime: document.getElementById('modal-created-time'),
    confirmCancel: document.getElementById('confirm-cancel'),
    confirmRedeem: document.getElementById('confirm-redeem'),

    // 確認刪除對話框
    deleteModal: document.getElementById('delete-modal'),
    deleteModalSpotName: document.getElementById('delete-modal-spot-name'),
    deleteModalStatus: document.getElementById('delete-modal-status'),
    deleteModalCreatedTime: document.getElementById('delete-modal-created-time'),
    deleteCancel: document.getElementById('delete-cancel'),
    deleteConfirm: document.getElementById('delete-confirm'),

    // 管理功能
    newSpotName: document.getElementById('new-spot-name'),
    addSpotBtn: document.getElementById('add-spot-btn'),
    resetEmail: document.getElementById('reset-email'),
    resetEmailBtn: document.getElementById('reset-email-btn'),

    // 地點列表功能
    refreshSpotsBtn: document.getElementById('refresh-spots-btn'),
    spotsList: document.getElementById('spots-list'),

    // QR Code 對話框
    qrcodeModal: document.getElementById('qrcode-modal'),
    qrcodeSpotName: document.getElementById('qrcode-spot-name'),
    qrcodeLoading: document.getElementById('qrcode-loading'),
    qrcodeContent: document.getElementById('qrcode-content'),
    qrcodeImage: document.getElementById('qrcode-image'),
    qrcodeLocationName: document.getElementById('qrcode-location-name'),
    qrcodeUrl: document.getElementById('qrcode-url'),
    qrcodeSizeSelect: document.getElementById('qrcode-size-select'),
    regenerateQr: document.getElementById('regenerate-qr'),
    downloadQr: document.getElementById('download-qr'),
    printQr: document.getElementById('print-qr'),
    qrcodeClose: document.getElementById('qrcode-close'),
    qrcodeCancel: document.getElementById('qrcode-cancel')
};

// 全域變數
let isLoggedIn = false;
let isProcessing = false;
let currentTicketId = null;
let currentDeleteTicketId = null;
let autoRefreshInterval = null;
let refreshCountdownInterval = null;
let nextRefreshTime = null;
let currentQRSpotId = null;
let currentQRCodeData = null;

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
});

// 初始化頁面
function initializePage() {
    // 檢查登入狀態
    checkLoginStatus();
}

// 設置事件監聽器
function setupEventListeners() {
    // 登入表單提交
    elements.loginForm.addEventListener('submit', handleLogin);

    // 登出按鈕
    elements.logoutBtn.addEventListener('click', handleLogout);

    // 搜尋功能
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchEmail.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 確認核銷對話框
    elements.confirmCancel.addEventListener('click', hideConfirmModal);
    elements.confirmRedeem.addEventListener('click', handleConfirmRedeem);

    // 確認刪除對話框
    elements.deleteCancel.addEventListener('click', hideDeleteModal);
    elements.deleteConfirm.addEventListener('click', handleConfirmDelete);

    // 顯示所有票券切換
    elements.showAllTickets.addEventListener('change', handleShowAllToggle);

    // 點擊對話框外部關閉
    elements.confirmModal.addEventListener('click', function(e) {
        if (e.target === elements.confirmModal) {
            hideConfirmModal();
        }
    });

    elements.deleteModal.addEventListener('click', function(e) {
        if (e.target === elements.deleteModal) {
            hideDeleteModal();
        }
    });

    // 管理功能
    elements.addSpotBtn.addEventListener('click', handleAddSpot);
    elements.resetEmailBtn.addEventListener('click', handleResetEmail);

    // Enter鍵支援
    elements.newSpotName.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAddSpot();
        }
    });

    elements.resetEmail.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleResetEmail();
        }
    });

    // 地點列表刷新
    elements.refreshSpotsBtn.addEventListener('click', handleRefreshSpots);

    // QR Code 對話框事件
    elements.qrcodeClose.addEventListener('click', hideQRCodeModal);
    elements.qrcodeCancel.addEventListener('click', hideQRCodeModal);
    elements.downloadQr.addEventListener('click', handleDownloadQR);
    elements.printQr.addEventListener('click', handlePrintQR);
    elements.regenerateQr.addEventListener('click', handleRegenerateQR);
    elements.qrcodeSizeSelect.addEventListener('change', handleRegenerateQR);

    // 點擊對話框外部關閉
    elements.qrcodeModal.addEventListener('click', function(e) {
        if (e.target === elements.qrcodeModal) {
            hideQRCodeModal();
        }
    });
}

// 檢查登入狀態
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/admin/tickets/test', {
            method: 'GET',
            credentials: 'include'
        });

        if (response.status === 401) {
            // 未登入，顯示登入頁面
            showLoginPage();
        } else {
            // 已登入，顯示管理頁面
            showAdminPage();
        }
    } catch (error) {
        console.error('檢查登入狀態時發生錯誤:', error);
        showLoginPage();
    }
}

// 處理登入
async function handleLogin(e) {
    e.preventDefault();

    if (isProcessing) return;

    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value.trim();

    // 驗證輸入
    if (!username || !password) {
        showLoginError('請輸入使用者名稱和密碼');
        return;
    }

    setLoginProcessing(true);
    hideLoginError();

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (result.success) {
            isLoggedIn = true;
            elements.adminUsername.textContent = username;
            showAdminPage();
        } else {
            showLoginError(result.message);
        }

    } catch (error) {
        console.error('登入時發生錯誤:', error);
        showLoginError('網路連線錯誤，請檢查網路連線後重試');
    } finally {
        setLoginProcessing(false);
    }
}

// 處理登出
async function handleLogout() {
    try {
        const response = await fetch('/api/admin/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            isLoggedIn = false;
            clearSearchResults();
            elements.usernameInput.value = '';
            elements.passwordInput.value = '';
            elements.searchEmail.value = '';
            // 停止自動刷新
            stopAutoRefresh();
            showLoginPage();
        }
    } catch (error) {
        console.error('登出時發生錯誤:', error);
        // 即使登出失敗也強制返回登入頁面
        isLoggedIn = false;
        stopAutoRefresh();
        showLoginPage();
    }
}

// 處理搜尋
async function handleSearch() {
    if (isProcessing) return;

    const email = elements.searchEmail.value.trim();
    const showAll = elements.showAllTickets.checked;

    // 驗證電子郵件格式
    if (!email) {
        showError('請輸入電子郵件');
        return;
    }

    if (!validateEmail(email)) {
        showError('請輸入正確的電子郵件格式 (example@email.com)');
        return;
    }

    setSearchProcessing(true);
    showLoadingState();

    try {
        const url = `/api/admin/tickets/${encodeURIComponent(email)}${showAll ? '?show_all=true' : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.status === 401) {
            // 登入過期，返回登入頁面
            showLoginPage();
            return;
        }

        const result = await response.json();

        if (result.success) {
            if (result.data && result.data.length > 0) {
                showResults(result.data, result.showAll);
            } else if (result.redeemedTickets && result.redeemedTickets.length > 0) {
                // 沒有可兌換的，但有已兌換的票券
                showRedeemedResults(result.redeemedTickets);
            } else {
                showNoResults();
            }
        } else {
            showError(result.message);
        }

    } catch (error) {
        console.error('搜尋時發生錯誤:', error);
        showError('網路連線錯誤，請檢查網路連線後重試');
    } finally {
        setSearchProcessing(false);
    }
}

// 處理顯示所有票券切換
function handleShowAllToggle() {
    // 如果目前有搜尋結果，重新搜尋
    const email = elements.searchEmail.value.trim();
    if (email && validateEmail(email)) {
        handleSearch();
    }
}

// 處理核銷確認
function handleRedeemClick(ticketId, spotName, createdTime) {
    currentTicketId = ticketId;
    elements.modalSpotName.textContent = spotName;
    elements.modalCreatedTime.textContent = formatDateTime(createdTime);
    showConfirmModal();
}

// 處理刪除確認
function handleDeleteClick(ticketId, spotName, status, createdTime) {
    currentDeleteTicketId = ticketId;
    elements.deleteModalSpotName.textContent = spotName;
    elements.deleteModalStatus.textContent = status === 'issued' ? '可兌換' : '已核銷';
    elements.deleteModalCreatedTime.textContent = formatDateTime(createdTime);
    showDeleteModal();
}

// 確認核銷
async function handleConfirmRedeem() {
    if (!currentTicketId || isProcessing) return;

    setModalProcessing(true);

    try {
        const response = await fetch(`/api/admin/redeem/${currentTicketId}`, {
            method: 'PUT',
            credentials: 'include'
        });

        if (response.status === 401) {
            hideConfirmModal();
            showLoginPage();
            return;
        }

        const result = await response.json();

        if (result.success) {
            // 核銷成功，重新搜尋以更新列表
            hideConfirmModal();
            handleSearch();
        } else {
            showError(result.message);
            hideConfirmModal();
        }

    } catch (error) {
        console.error('核銷時發生錯誤:', error);
        showError('網路連線錯誤，請檢查網路連線後重試');
        hideConfirmModal();
    } finally {
        setModalProcessing(false);
    }
}

// 確認刪除
async function handleConfirmDelete() {
    if (!currentDeleteTicketId || isProcessing) return;

    setModalProcessing(true);

    try {
        const response = await fetch(`/api/admin/tickets/${currentDeleteTicketId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.status === 401) {
            hideDeleteModal();
            showLoginPage();
            return;
        }

        const result = await response.json();

        if (result.success) {
            // 刪除成功，重新搜尋以更新列表
            hideDeleteModal();
            showSuccessMessage(result.message);
            handleSearch();
        } else {
            showError(result.message);
            hideDeleteModal();
        }

    } catch (error) {
        console.error('刪除時發生錯誤:', error);
        showError('網路連線錯誤，請檢查網路連線後重試');
        hideDeleteModal();
    } finally {
        setModalProcessing(false);
    }
}

// 顯示/隱藏頁面
function showLoginPage() {
    elements.loginPage.classList.remove('hidden');
    elements.adminPage.classList.add('hidden');
    elements.usernameInput.focus();
}

function showAdminPage() {
    elements.loginPage.classList.add('hidden');
    elements.adminPage.classList.remove('hidden');
    elements.searchEmail.focus();
    // 載入地點列表
    loadSpotsList();
    // 啟動自動刷新機制
    startAutoRefresh();
}

// 顯示載入狀態
function showLoadingState() {
    hideAllResults();
    elements.loadingState.classList.remove('hidden');
}

// 顯示錯誤狀態
function showError(message) {
    hideAllResults();
    elements.errorMessageText.textContent = message;
    elements.errorState.classList.remove('hidden');
}

// 顯示無結果狀態
function showNoResults() {
    hideAllResults();
    elements.noResults.classList.remove('hidden');
}

// 顯示已兌換的抽獎資格
function showRedeemedResults(redeemedTickets) {
    hideAllResults();

    // 更新標題
    elements.resultsTitle.textContent = '🏆 已兌換的抽獎資格';
    elements.resultsCount.textContent = `${redeemedTickets.length} 筆 (已兌換)`;
    elements.resultsList.classList.remove('hidden');

    // 生成已兌換抽獎券列表
    elements.ticketsList.innerHTML = '';
    redeemedTickets.forEach(ticket => {
        const ticketElement = createRedeemedTicketElement(ticket);
        elements.ticketsList.appendChild(ticketElement);
    });
}

// 顯示搜尋結果
function showResults(tickets, showAll = false) {
    hideAllResults();

    // 更新標題
    elements.resultsTitle.textContent = showAll ? '🎫 所有抽獎資格' : '🎫 可兌換的抽獎資格';
    elements.resultsCount.textContent = `${tickets.length} 筆`;
    elements.resultsList.classList.remove('hidden');

    // 生成抽獎券列表
    elements.ticketsList.innerHTML = '';
    tickets.forEach(ticket => {
        const ticketElement = createTicketElement(ticket, showAll);
        elements.ticketsList.appendChild(ticketElement);
    });
}

// 創建抽獎券元素
function createTicketElement(ticket, showAll = false) {
    const ticketDiv = document.createElement('div');
    const isRedeemed = ticket.status === 'redeemed';

    ticketDiv.className = `ticket-item ${isRedeemed ? 'redeemed' : ''}`;

    const statusBadge = isRedeemed ? '<span class="status-badge redeemed">已核銷</span>' : '<span class="status-badge issued">可兌換</span>';
    const redeemedTime = isRedeemed && ticket.redeemed_at ? `<span>✅ ${formatDateTime(ticket.redeemed_at)}</span>` : '';

    let actionButtons = '';
    if (isRedeemed || showAll) {
        // 顯示刪除按鈕
        actionButtons = `
            <button class="delete-btn" onclick="handleDeleteClick('${ticket.id}', '${ticket.spot_name || ticket.spot_id}', '${ticket.status}', '${ticket.created_at}')">
                🗑️ 刪除
            </button>
        `;

        // 如果是可兌換的票券，也顯示核銷按鈕
        if (!isRedeemed) {
            actionButtons = `
                <button class="redeem-btn" onclick="handleRedeemClick('${ticket.id}', '${ticket.spot_name || ticket.spot_id}', '${ticket.created_at}')">
                    核銷
                </button>
            ` + actionButtons;
        }
    } else {
        // 只顯示核銷按鈕
        actionButtons = `
            <button class="redeem-btn" onclick="handleRedeemClick('${ticket.id}', '${ticket.spot_name || ticket.spot_id}', '${ticket.created_at}')">
                核銷
            </button>
        `;
    }

    ticketDiv.innerHTML = `
        <div class="ticket-info">
            <div class="ticket-header">
                <h4>${ticket.spot_name || ticket.spot_id}</h4>
                ${statusBadge}
            </div>
            <div class="ticket-meta">
                <span>🎫 ${ticket.serial_number}</span>
                <span>⏰ ${formatDateTime(ticket.created_at)}</span>
                ${redeemedTime}
            </div>
        </div>
        <div class="ticket-actions">
            ${actionButtons}
        </div>
    `;

    return ticketDiv;
}

// 創建已兌換抽獎券元素
function createRedeemedTicketElement(ticket) {
    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'ticket-item redeemed-only';

    const redeemedTime = ticket.redeemed_at ? formatDateTime(ticket.redeemed_at) : '未知時間';

    ticketDiv.innerHTML = `
        <div class="ticket-info">
            <div class="ticket-header">
                <h4>${ticket.spot_name || ticket.spot_id}</h4>
                <span class="status-badge redeemed">🏆 已兌換</span>
            </div>
            <div class="ticket-meta">
                <span>🎫 ${ticket.serial_number}</span>
                <span>📅 領取時間: ${formatDateTime(ticket.created_at)}</span>
                <span>✅ 兌換時間: ${redeemedTime}</span>
            </div>
            <div class="redeemed-notice">
                <p>🎉 此電子郵件已成功兌換抽獎機會，無法重複兌換</p>
            </div>
        </div>
    `;

    return ticketDiv;
}

// 隱藏所有結果狀態
function hideAllResults() {
    elements.loadingState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    elements.noResults.classList.add('hidden');
    elements.resultsList.classList.add('hidden');
}

// 清除搜尋結果
function clearSearchResults() {
    hideAllResults();
    elements.ticketsList.innerHTML = '';
}

// 顯示/隱藏確認對話框
function showConfirmModal() {
    elements.confirmModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideConfirmModal() {
    elements.confirmModal.classList.add('hidden');
    document.body.style.overflow = '';
    currentTicketId = null;
}

// 顯示/隱藏刪除確認對話框
function showDeleteModal() {
    elements.deleteModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideDeleteModal() {
    elements.deleteModal.classList.add('hidden');
    document.body.style.overflow = '';
    currentDeleteTicketId = null;
}

// 顯示登入錯誤
function showLoginError(message) {
    elements.loginErrorText.textContent = message;
    elements.loginError.classList.remove('hidden');
}

// 隱藏登入錯誤
function hideLoginError() {
    elements.loginError.classList.add('hidden');
}

// 設置處理狀態
function setLoginProcessing(processing) {
    isProcessing = processing;
    elements.loginBtn.disabled = processing;

    const btnText = elements.loginBtn.querySelector('.btn-text');
    const btnLoading = elements.loginBtn.querySelector('.btn-loading');

    if (processing) {
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

function setSearchProcessing(processing) {
    isProcessing = processing;
    elements.searchBtn.disabled = processing;

    const btnText = elements.searchBtn.querySelector('.btn-text');
    const btnLoading = elements.searchBtn.querySelector('.btn-loading');

    if (processing) {
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

function setModalProcessing(processing) {
    elements.confirmRedeem.disabled = processing;
    elements.confirmCancel.disabled = processing;
    elements.deleteConfirm.disabled = processing;
    elements.deleteCancel.disabled = processing;
}

// 驗證電子郵件格式
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 格式化日期時間
function formatDateTime(dateString) {
    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch (error) {
        console.error('日期格式化錯誤:', error);
        return dateString;
    }
}

// 將函數設為全域以便在 HTML 中調用
window.handleRedeemClick = handleRedeemClick;
window.handleDeleteClick = handleDeleteClick;

// 新增地點功能
async function handleAddSpot() {
    if (isProcessing) return;

    const spotName = elements.newSpotName.value.trim();

    // 驗證輸入
    if (!spotName) {
        showError('請輸入地點名稱');
        elements.newSpotName.focus();
        return;
    }

    setAddSpotProcessing(true);

    try {
        const response = await fetch('/api/admin/spots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                spot_name: spotName
            })
        });

        if (response.status === 401) {
            showLoginPage();
            return;
        }

        const result = await response.json();

        if (result.success) {
            const qrUrl = result.data.qr_url || `${window.location.origin}/?spot_id=${result.data.spot_id}`;
            showSuccessMessage(`地點「${spotName}」新增成功！\n地點ID：${result.data.spot_id}\nQR Code 網址：${qrUrl}`);
            clearAddSpotForm();
            // 刷新地點列表
            loadSpotsList();
        } else {
            showError(result.message);
        }

    } catch (error) {
        console.error('新增地點時發生錯誤:', error);
        showError('網路連線錯誤，請檢查網路連線後重試');
    } finally {
        setAddSpotProcessing(false);
    }
}

// 重置Email狀態功能
async function handleResetEmail() {
    if (isProcessing) return;

    const email = elements.resetEmail.value.trim();

    // 驗證輸入
    if (!email) {
        showError('請輸入電子郵件');
        elements.resetEmail.focus();
        return;
    }

    if (!validateEmail(email)) {
        showError('請輸入正確的電子郵件格式');
        elements.resetEmail.focus();
        return;
    }

    // 確認操作
    if (!confirm(`確定要重置 ${email} 的兌換狀態嗎？\n\n重置後該email可以重新兌換抽獎機會。`)) {
        return;
    }

    setResetEmailProcessing(true);

    try {
        const response = await fetch(`/api/admin/reset-email/${encodeURIComponent(email)}`, {
            method: 'PUT',
            credentials: 'include'
        });

        if (response.status === 401) {
            showLoginPage();
            return;
        }

        const result = await response.json();

        if (result.success) {
            showSuccessMessage(result.message);
            elements.resetEmail.value = '';
        } else {
            showError(result.message);
        }

    } catch (error) {
        console.error('重置email時發生錯誤:', error);
        showError('網路連線錯誤，請檢查網路連線後重試');
    } finally {
        setResetEmailProcessing(false);
    }
}

// 顯示成功訊息
function showSuccessMessage(message) {
    // 移除現有的成功訊息
    const existingSuccess = document.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }

    // 創建新的成功訊息
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;

    // 插入到admin-content的開始位置
    const adminContent = document.querySelector('.admin-content');
    adminContent.insertBefore(successDiv, adminContent.firstChild);

    // 3秒後自動移除
    setTimeout(() => {
        if (successDiv && successDiv.parentNode) {
            successDiv.remove();
        }
    }, 5000);
}

// 清空新增地點表單
function clearAddSpotForm() {
    elements.newSpotName.value = '';
}

// 設置新增地點處理狀態
function setAddSpotProcessing(processing) {
    isProcessing = processing;
    elements.addSpotBtn.disabled = processing;

    const btnText = elements.addSpotBtn.querySelector('.btn-text');
    const btnLoading = elements.addSpotBtn.querySelector('.btn-loading');

    if (processing) {
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

// 設置重置Email處理狀態
function setResetEmailProcessing(processing) {
    isProcessing = processing;
    elements.resetEmailBtn.disabled = processing;

    const btnText = elements.resetEmailBtn.querySelector('.btn-text');
    const btnLoading = elements.resetEmailBtn.querySelector('.btn-loading');

    if (processing) {
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

// 摺疊功能
function toggleCollapse(contentId) {
    const content = document.getElementById(contentId);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.collapse-icon');

    if (content.classList.contains('collapsed')) {
        // 展開
        content.classList.remove('collapsed');
        icon.textContent = '▼';
    } else {
        // 收合
        content.classList.add('collapsed');
        icon.textContent = '▶';
    }
}

// 地點列表載入
async function loadSpotsList() {
    try {
        const response = await fetch('/api/admin/spots', {
            method: 'GET',
            credentials: 'include'
        });

        if (response.status === 401) {
            showLoginPage();
            return;
        }

        const result = await response.json();

        if (result.success) {
            displaySpotsList(result.data);
        } else {
            elements.spotsList.innerHTML = '<p class="error-text">載入地點列表失敗</p>';
        }

    } catch (error) {
        console.error('載入地點列表時發生錯誤:', error);
        elements.spotsList.innerHTML = '<p class="error-text">網路連線錯誤</p>';
    }
}

// 顯示地點列表
function displaySpotsList(spots) {
    if (!spots || spots.length === 0) {
        elements.spotsList.innerHTML = '<p class="no-data-text">目前沒有任何地點</p>';
        return;
    }

    let spotsHtml = '<div class="spots-grid">';
    spots.forEach(spot => {
        const statusIcon = spot.is_active ? '✅' : '❌';
        const statusText = spot.is_active ? '啟用' : '停用';
        const qrUrl = `${window.location.origin}/?spot_id=${spot.id}`;

        spotsHtml += `
            <div class="spot-card">
                <div class="spot-header">
                    <h4>${spot.name}</h4>
                    <span class="spot-status ${spot.is_active ? 'active' : 'inactive'}">
                        ${statusIcon} ${statusText}
                    </span>
                </div>
                <div class="spot-details">
                    <p><strong>地點ID:</strong> ${spot.id}</p>
                    ${spot.description ? `<p><strong>描述:</strong> ${spot.description}</p>` : ''}
                    <p><strong>QR Code 網址:</strong></p>
                    <div class="qr-url">
                        <input type="text" value="${qrUrl}" readonly onclick="this.select()">
                        <button class="copy-btn" onclick="copyToClipboard('${qrUrl}')" title="複製網址">
                            📋
                        </button>
                        <button class="qr-btn" data-spot-id="${spot.id}" data-spot-name="${spot.name}" title="顯示 QR Code">
                            📱 QR Code
                        </button>
                    </div>
                </div>
                <div class="spot-actions">
                    <button class="delete-spot-btn" data-spot-id="${spot.id}" data-spot-name="${spot.name}" title="刪除地點">
                        🗑️ 刪除地點
                    </button>
                </div>
            </div>
        `;
    });
    spotsHtml += '</div>';

    elements.spotsList.innerHTML = spotsHtml;

    // 為新生成的刪除按鈕添加事件監聽器
    const deleteButtons = elements.spotsList.querySelectorAll('.delete-spot-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const spotId = this.getAttribute('data-spot-id');
            const spotName = this.getAttribute('data-spot-name');
            handleDeleteSpot(spotId, spotName);
        });
    });

    // 為新生成的 QR Code 按鈕添加事件監聽器
    const qrButtons = elements.spotsList.querySelectorAll('.qr-btn');
    qrButtons.forEach(button => {
        button.addEventListener('click', function() {
            const spotId = this.getAttribute('data-spot-id');
            const spotName = this.getAttribute('data-spot-name');
            showQRCodeModal(spotId, spotName);
        });
    });
}

// 刷新地點列表
async function handleRefreshSpots() {
    if (isProcessing) return;

    setRefreshSpotsProcessing(true);
    await loadSpotsList();
    setRefreshSpotsProcessing(false);
}

// 設置刷新地點列表處理狀態
function setRefreshSpotsProcessing(processing) {
    isProcessing = processing;
    elements.refreshSpotsBtn.disabled = processing;

    const btnText = elements.refreshSpotsBtn.querySelector('.btn-text');
    const btnLoading = elements.refreshSpotsBtn.querySelector('.btn-loading');

    if (processing) {
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

// 複製到剪貼簿
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showSuccessMessage('網址已複製到剪貼簿');
    }).catch(err => {
        console.error('複製失敗:', err);
        showError('複製失敗，請手動複製');
    });
}

// 刪除地點功能
async function handleDeleteSpot(spotId, spotName) {
    if (isProcessing) return;

    // 確認刪除
    if (!confirm(`確定要刪除地點「${spotName}」嗎？\n\n此操作無法復原，相關的QR Code將失效！`)) {
        return;
    }

    setDeleteSpotProcessing(true);

    try {
        const response = await fetch(`/api/admin/spots/${encodeURIComponent(spotId)}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.status === 401) {
            showLoginPage();
            return;
        }

        const result = await response.json();

        if (result.success) {
            let message = result.message;
            if (result.data && result.data.affected_tickets > 0) {
                message += `\n相關的 ${result.data.affected_tickets} 筆抽獎記錄也已清理。`;
            }
            showSuccessMessage(message);
            // 刷新地點列表
            loadSpotsList();
        } else {
            showError(result.message);
        }

    } catch (error) {
        console.error('刪除地點時發生錯誤:', error);
        showError('網路連線錯誤，請檢查網路連線後重試');
    } finally {
        setDeleteSpotProcessing(false);
    }
}

// 設置刪除地點處理狀態
function setDeleteSpotProcessing(processing) {
    isProcessing = processing;
    // 禁用所有刪除按鈕以防止重複操作
    const deleteButtons = document.querySelectorAll('.delete-spot-btn');
    deleteButtons.forEach(btn => {
        btn.disabled = processing;
        if (processing) {
            btn.textContent = '刪除中...';
        } else {
            btn.innerHTML = '🗑️ 刪除地點';
        }
    });
}

// 自動刷新機制
function startAutoRefresh() {
    // 清除現有的計時器
    stopAutoRefresh();

    console.log('啟動自動刷新機制 (每5分鐘)');

    // 設置下次刷新時間
    nextRefreshTime = new Date(Date.now() + 5 * 60 * 1000);

    // 設置自動刷新計時器 (5分鐘 = 300000毫秒)
    autoRefreshInterval = setInterval(() => {
        console.log('執行自動刷新...');
        performAutoRefresh();
        // 重置下次刷新時間
        nextRefreshTime = new Date(Date.now() + 5 * 60 * 1000);
    }, 5 * 60 * 1000);

    // 啟動倒數計時顯示
    startRefreshCountdown();
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('停止自動刷新');
    }

    if (refreshCountdownInterval) {
        clearInterval(refreshCountdownInterval);
        refreshCountdownInterval = null;
    }

    // 清除倒數計時顯示
    const countdownElement = document.getElementById('refresh-countdown');
    if (countdownElement) {
        countdownElement.remove();
    }
}

function performAutoRefresh() {
    // 刷新地點列表
    loadSpotsList();

    // 如果有搜索條件，重新執行搜索
    const email = elements.searchEmail.value.trim();
    if (email && validateEmail(email)) {
        console.log('自動重新搜索:', email);
        handleSearch();
    }

    // 顯示刷新提示
    showAutoRefreshNotification();
}

function startRefreshCountdown() {
    // 創建倒數計時顯示元素
    createCountdownDisplay();

    refreshCountdownInterval = setInterval(() => {
        updateCountdownDisplay();
    }, 1000);
}

function createCountdownDisplay() {
    // 檢查是否已存在
    let countdownElement = document.getElementById('refresh-countdown');
    if (countdownElement) {
        return;
    }

    countdownElement = document.createElement('div');
    countdownElement.id = 'refresh-countdown';
    countdownElement.className = 'refresh-countdown';

    // 插入到標題右側
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
        headerActions.insertBefore(countdownElement, headerActions.firstChild);
    }
}

function updateCountdownDisplay() {
    const countdownElement = document.getElementById('refresh-countdown');
    if (!countdownElement || !nextRefreshTime) {
        return;
    }

    const now = new Date();
    const timeDiff = nextRefreshTime - now;

    if (timeDiff <= 0) {
        countdownElement.innerHTML = '🔄 刷新中...';
        return;
    }

    const minutes = Math.floor(timeDiff / 60000);
    const seconds = Math.floor((timeDiff % 60000) / 1000);

    countdownElement.innerHTML = `⏱️ 下次刷新: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showAutoRefreshNotification() {
    // 移除現有的通知
    const existingNotification = document.querySelector('.auto-refresh-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // 創建新通知
    const notification = document.createElement('div');
    notification.className = 'auto-refresh-notification';
    notification.innerHTML = '🔄 自動刷新完成';

    // 插入到admin-content的開始位置
    const adminContent = document.querySelector('.admin-content');
    if (adminContent) {
        adminContent.insertBefore(notification, adminContent.firstChild);

        // 3秒後自動移除
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// QR Code 相關函數
async function showQRCodeModal(spotId, spotName) {
    currentQRSpotId = spotId;
    elements.qrcodeSpotName.textContent = spotName;

    // 顯示對話框和載入狀態
    elements.qrcodeModal.classList.remove('hidden');
    elements.qrcodeLoading.classList.remove('hidden');
    elements.qrcodeContent.classList.add('hidden');
    document.body.style.overflow = 'hidden';

    // 獲取 QR Code
    await generateQRCode(spotId, spotName);
}

function hideQRCodeModal() {
    elements.qrcodeModal.classList.add('hidden');
    document.body.style.overflow = '';
    currentQRSpotId = null;
    currentQRCodeData = null;
}

async function generateQRCode(spotId, spotName, size = null) {
    if (!size) {
        size = elements.qrcodeSizeSelect.value;
    }

    try {
        const response = await fetch(`/api/qrcode/${encodeURIComponent(spotId)}?size=${size}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.status === 401) {
            hideQRCodeModal();
            showLoginPage();
            return;
        }

        const result = await response.json();

        if (result.success) {
            currentQRCodeData = result.data;

            // 更新 UI
            elements.qrcodeImage.src = result.data.qr_image;
            elements.qrcodeLocationName.textContent = result.data.spot_name;
            elements.qrcodeUrl.textContent = result.data.qr_url;
            elements.qrcodeSizeSelect.value = result.data.size;

            // 隱藏載入狀態，顯示內容
            elements.qrcodeLoading.classList.add('hidden');
            elements.qrcodeContent.classList.remove('hidden');
        } else {
            showError(result.message);
            hideQRCodeModal();
        }

    } catch (error) {
        console.error('生成 QR Code 時發生錯誤:', error);
        showError('生成 QR Code 失敗，請檢查網路連線後重試');
        hideQRCodeModal();
    }
}

async function handleRegenerateQR() {
    if (!currentQRSpotId) return;

    // 顯示載入狀態
    elements.qrcodeLoading.classList.remove('hidden');
    elements.qrcodeContent.classList.add('hidden');

    const spotName = elements.qrcodeSpotName.textContent;
    const size = elements.qrcodeSizeSelect.value;

    await generateQRCode(currentQRSpotId, spotName, size);
}

function handleDownloadQR() {
    if (!currentQRCodeData || !currentQRCodeData.qr_image) {
        showError('沒有可下載的 QR Code');
        return;
    }

    // 創建下載連結
    const link = document.createElement('a');
    link.href = currentQRCodeData.qr_image;
    link.download = `qrcode-${currentQRCodeData.spot_name}-${currentQRCodeData.spot_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccessMessage('QR Code 圖片已下載');
}

function handlePrintQR() {
    if (!currentQRCodeData || !currentQRCodeData.qr_image) {
        showError('沒有可列印的 QR Code');
        return;
    }

    // 創建列印視窗
    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>列印 QR Code - ${currentQRCodeData.spot_name}</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    text-align: center;
                }
                .print-container {
                    max-width: 600px;
                    margin: 0 auto;
                }
                .qr-image {
                    max-width: 100%;
                    height: auto;
                    border: 2px solid #ddd;
                    margin: 20px 0;
                }
                .info {
                    margin: 20px 0;
                    font-size: 18px;
                }
                .url {
                    word-break: break-all;
                    font-size: 14px;
                    color: #666;
                    margin-top: 10px;
                }
                @media print {
                    body { margin: 0; padding: 10mm; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="print-container">
                <h1>尋寶活動 QR Code</h1>
                <div class="info">
                    <strong>地點名稱：${currentQRCodeData.spot_name}</strong>
                </div>
                <img src="${currentQRCodeData.qr_image}" alt="QR Code" class="qr-image">
                <div class="url">
                    網址：${currentQRCodeData.qr_url}
                </div>
                <div class="info">
                    <small>掃描此 QR Code 參與尋寶活動</small>
                </div>
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // 等待圖片載入後列印
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };
}

// 將函數設為全域以便在 HTML 中調用
window.toggleCollapse = toggleCollapse;
window.copyToClipboard = copyToClipboard;
window.handleDeleteSpot = handleDeleteSpot;
window.showQRCodeModal = showQRCodeModal;