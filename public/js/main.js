// DOM 元素
const elements = {
    errorMessage: document.getElementById('error-message'),
    errorText: document.getElementById('error-text'),
    successMessage: document.getElementById('success-message'),
    successText: document.getElementById('success-text'),
    locationInfo: document.getElementById('location-info'),
    locationName: document.getElementById('location-name'),
    claimForm: document.getElementById('claim-form'),
    emailInput: document.getElementById('email-input'),
    claimButton: document.getElementById('claim-button'),
    btnText: document.querySelector('.btn-text'),
    btnLoading: document.querySelector('.btn-loading'),
    invalidPage: document.getElementById('invalid-page')
};

// 全域變數
let currentSpotId = null;
let isProcessing = false;

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
});

// 初始化頁面
function initializePage() {
    // 從 URL 參數中取得 spot_id
    const urlParams = new URLSearchParams(window.location.search);
    currentSpotId = urlParams.get('spot_id');

    if (!currentSpotId) {
        showInvalidPage();
        return;
    }

    // 驗證地點並載入資訊
    validateAndLoadSpot(currentSpotId);
}

// 設置事件監聽器
function setupEventListeners() {
    // 電子郵件輸入驗證
    elements.emailInput.addEventListener('blur', validateEmailInput);

    // 提交按鈕點擊
    elements.claimButton.addEventListener('click', handleClaimSubmit);

    // 按 Enter 鍵提交
    elements.emailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleClaimSubmit();
        }
    });
}

// 驗證並載入地點資訊
async function validateAndLoadSpot(spotId) {
    try {
        // 向後端查詢地點資訊
        const response = await fetch(`/api/spot/${encodeURIComponent(spotId)}`);

        if (!response.ok) {
            showInvalidPage();
            return;
        }

        const result = await response.json();

        if (result.success && result.data) {
            // 顯示地點資訊和表單
            elements.locationName.textContent = result.data.spot_name;

            showElement(elements.locationInfo);
            showElement(elements.claimForm);
        } else {
            showInvalidPage();
        }

    } catch (error) {
        console.error('載入地點資訊時發生錯誤:', error);
        showInvalidPage();
    }
}

// 驗證電子郵件格式
function validateEmailInput() {
    const email = elements.emailInput.value;
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (email && !isValid) {
        elements.emailInput.classList.add('error');
        showError('請輸入正確的電子郵件格式 (example@email.com)');
    } else {
        elements.emailInput.classList.remove('error');
        hideElement(elements.errorMessage);
    }

    return isValid;
}

// 處理領取提交
async function handleClaimSubmit() {
    if (isProcessing) return;

    const email = elements.emailInput.value.trim();

    // 驗證輸入
    if (!email) {
        showError('請輸入電子郵件');
        elements.emailInput.focus();
        return;
    }

    if (!validateEmailInput()) {
        elements.emailInput.focus();
        return;
    }

    // 開始處理
    setProcessingState(true);

    try {
        const response = await fetch('/api/claim-ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                spot_id: currentSpotId,
                email: email
            })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(result.message);
            hideElement(elements.claimForm);
        } else {
            showError(result.message);
        }

    } catch (error) {
        console.error('提交時發生錯誤:', error);
        showError('網路連線錯誤，請檢查網路連線後重試');
    } finally {
        setProcessingState(false);
    }
}

// 設置處理狀態
function setProcessingState(processing) {
    isProcessing = processing;
    elements.claimButton.disabled = processing;

    if (processing) {
        hideElement(elements.btnText);
        showElement(elements.btnLoading);
    } else {
        showElement(elements.btnText);
        hideElement(elements.btnLoading);
    }
}

// 顯示錯誤訊息
function showError(message) {
    elements.errorText.textContent = message;
    showElement(elements.errorMessage);
    hideElement(elements.successMessage);

    // 自動隱藏錯誤訊息
    setTimeout(() => {
        hideElement(elements.errorMessage);
    }, 5000);
}

// 顯示成功訊息
function showSuccess(message) {
    elements.successText.textContent = message;
    showElement(elements.successMessage);
    hideElement(elements.errorMessage);
}

// 顯示無效頁面
function showInvalidPage() {
    hideElement(elements.locationInfo);
    hideElement(elements.claimForm);
    showElement(elements.invalidPage);
}

// 工具函數：顯示元素
function showElement(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

// 工具函數：隱藏元素
function hideElement(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

// 檢測是否為手機設備
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 頁面載入時的歡迎動畫效果
function initializeAnimations() {
    // 可以在這裡添加更多動畫效果
    document.body.style.opacity = '1';
}