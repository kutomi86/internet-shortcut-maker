console.log("[SHORTCUT-MAKER-DEBUG] popup.js script file loaded and executed successfully!");

document.getElementById('saveBtn').addEventListener('click', () => {
    console.log("[SHORTCUT-MAKER-DEBUG] Step 1: Popup 'Save as .url' button clicked. Sending message to background...");
    chrome.runtime.sendMessage({ action: 'save_current_tab' }, (response) => {
        console.log("[SHORTCUT-MAKER-DEBUG] Step 6 (Popup): Received response from background script:", JSON.stringify(response));
        if (chrome.runtime.lastError) {
            showError(chrome.runtime.lastError.message, chrome.runtime.lastError);
        } else if (response && !response.success) {
            showError(response.error || "Unknown error occurred.", response);
        } else {
            console.log("[SHORTCUT-MAKER-DEBUG] Step 7: Save successful. Closing popup.");
            window.close(); // Close popup after successful save
        }
    });
});

function showError(msg, fullErrorContext) {
    console.error("[SHORTCUT-MAKER]", "Shortcut Maker Popup Error:", msg, "\nContext:", fullErrorContext ? JSON.stringify(fullErrorContext) : "None");
    const errorBox = document.getElementById('errorBox');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = msg;
    errorBox.classList.remove('hidden');
}

const hotkeyInput = document.getElementById('hotkeyInput');

// Default format
function formatHotkey(hk) {
    let parts = [];
    if (hk.ctrlKey) parts.push('Ctrl');
    if (hk.shiftKey) parts.push('Shift');
    if (hk.altKey) parts.push('Alt');
    parts.push(hk.key.toUpperCase());
    return parts.join(' + ');
}

let currentHotkey = {
    ctrlKey: true,
    shiftKey: true,
    altKey: true,
    key: 'D'
};

chrome.storage.local.get(['customHotkey'], (result) => {
    if (result.customHotkey) {
        currentHotkey = result.customHotkey;
    } else {
        // Set default if not set
        chrome.storage.local.set({ customHotkey: currentHotkey });
    }
    hotkeyInput.value = formatHotkey(currentHotkey);
});

hotkeyInput.addEventListener('keydown', (e) => {
    e.preventDefault(); // Prevent typing

    // Ignore if just modifiers
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return;
    }

    // Only alpha-numeric or standard keys
    if (e.key.length !== 1 && !e.key.match(/^[a-zA-Z0-9]$/)) {
        return;
    }

    const newHotkey = {
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        key: e.key.toUpperCase()
    };

    currentHotkey = newHotkey;
    hotkeyInput.value = formatHotkey(newHotkey);

    chrome.storage.local.set({ customHotkey: newHotkey });
});