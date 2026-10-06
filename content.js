let currentHotkey = {
    ctrlKey: true,
    shiftKey: true,
    altKey: true,
    key: 'D'
};

chrome.storage.local.get(['customHotkey'], (result) => {
    if (result.customHotkey) {
        currentHotkey = result.customHotkey;
    }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.customHotkey) {
        currentHotkey = changes.customHotkey.newValue;
    }
});

document.addEventListener('keydown', (e) => {
    if (!currentHotkey) return;

    if (e.ctrlKey === currentHotkey.ctrlKey &&
        e.shiftKey === currentHotkey.shiftKey &&
        e.altKey === currentHotkey.altKey &&
        e.key.toUpperCase() === currentHotkey.key.toUpperCase()) {

        // Prevent default action
        e.preventDefault();

        // Send message to background script safely
        try {
            if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: 'save_current_tab_from_content' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("[SHORTCUT-MAKER]", "Shortcut Maker: Error triggering save:", chrome.runtime.lastError.message);
                    }
                });
            } else {
                console.warn("Shortcut Maker: Extension was reloaded. Please refresh this page to use the hotkey.");
                alert("Shortcut Maker extension was recently updated. Please refresh the page to use the hotkey here.");
            }
        } catch (err) {
            console.error("[SHORTCUT-MAKER]", "Shortcut Maker: Could not communicate with extension. Please refresh the page.", err);
        }
    }
});
