// Helper to create and prompt save for .url file
function createAndSaveShortcut(tab, callback) {
    try {
        if (!tab || !tab.url) {
            console.error("[SHORTCUT-MAKER]", "Shortcut Maker Error: No valid URL found for the active tab.", { tabObject: tab });
            if (callback) callback({ success: false, error: "No valid URL found for this tab. It might be a restricted page or missing permissions." });
            return;
        }

        const fileContent = `[InternetShortcut]\nURL=${tab.url}\n`;

        // 2. Sanitize title for valid Windows/Chrome filename
        let safeTitle = (tab.title || "Shortcut")
            // Remove control characters
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
            // Replace OS reserved characters with a dash
            .replace(/[<>:"/\\|?*~]/g, "-")
            // Replace all dots to completely avoid Chrome's ".." path traversal security blocks
            .replace(/\./g, " ")
            // Remove leading dots, dashes, and tildes (Chrome Download API restriction)
            .replace(/^[-.~]+/g, "")
            // Collapse multiple spaces
            .replace(/\s+/g, " ")
            .trim();



        // Truncate length to avoid OS path length limits
        if (safeTitle.length > 150) {
            safeTitle = safeTitle.substring(0, 150).trim();
        }

        if (!safeTitle) {
            safeTitle = "Shortcut";
        }

        const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent);

        chrome.downloads.download({
            url: dataUrl,
            filename: `${safeTitle}.url`,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error("[SHORTCUT-MAKER]", "Shortcut Maker Download Error:", chrome.runtime.lastError);
                if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
            } else {
                if (callback) callback({ success: true });
            }
        });
    } catch (e) {
        console.error("[SHORTCUT-MAKER]", "Shortcut Maker Execution Error:", e);
        if (callback) callback({ success: false, error: e.toString() });
    }
}

// Listen for Context Menu creation on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "save-as-shortcut",
        title: "Save page as .url shortcut",
        contexts: ["page"]
    });
});

// Listen for Context Menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "save-as-shortcut") {
        createAndSaveShortcut(tab);
    }
});

// Listen for messages from popup UI or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "save_current_tab" || message.action === "save_current_tab_from_content") {
        if (sender.tab && message.action === "save_current_tab_from_content") {
            createAndSaveShortcut(sender.tab, sendResponse);
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    createAndSaveShortcut(tabs[0], sendResponse);
                } else {
                    sendResponse({ success: false, error: "No active tab found in the current window." });
                }
            });
        }
        return true;
    }
});