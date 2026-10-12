// Helper to create and prompt save for .url file
function createAndSaveShortcut(tab, callback) {
    console.log("[SHORTCUT-MAKER-DEBUG] Step 2: createAndSaveShortcut process started.");
    try {
        console.log("[SHORTCUT-MAKER-DEBUG] Step 3: Inspecting tab object:", JSON.stringify({ url: tab?.url, title: tab?.title }));
        if (!tab || !tab.url) {
            console.error("[SHORTCUT-MAKER]", "Shortcut Maker Error: No valid URL found for the active tab.", JSON.stringify({ tabObject: tab }));
            if (callback) callback({ success: false, error: "No valid URL found for this tab. It might be a restricted page or missing permissions." });
            return;
        }

        const fileContent = `[InternetShortcut]\nURL=${tab.url}\n`;

        console.log("[SHORTCUT-MAKER-DEBUG] Step 4a: Raw tab.title received:", JSON.stringify(tab.title));

        // Sanitize title for valid Windows/Chrome filename
        let safeTitle = (tab.title || "Unknown Video Name")
            // Remove leading YouTube notification badge like "(225) " at the very start
            .replace(/^\(\d+\)\s*/, "")
            // Remove control characters
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
            // Remove remaining parentheses if any
            .replace(/[()]/g, "")
            // Replace OS reserved characters with a dash
            .replace(/[<>:"/\\|?*~]/g, "-")
            // Replace all dots to completely avoid Chrome's ".." path traversal security blocks
            .replace(/\./g, " ")
            // Remove leading and trailing non-alphanumeric characters (symbols, dashes, spaces)
            .replace(/^[^a-zA-Z0-9\p{L}\p{N}]+|[^a-zA-Z0-9\p{L}\p{N}]+$/gu, "")
            // Collapse multiple spaces
            .replace(/\s+/g, " ")
            .trim();

        console.log("[SHORTCUT-MAKER-DEBUG] Step 4b: Sanitized safeTitle generated:", JSON.stringify(safeTitle));

        // Truncate length to avoid OS path length limits
        if (safeTitle.length > 150) {
            safeTitle = safeTitle.substring(0, 150).trim();
            console.log("[SHORTCUT-MAKER-DEBUG] Step 4c: safeTitle truncated to:", JSON.stringify(safeTitle));
        }

        if (!safeTitle) {
            safeTitle = "Unknown Video Name";
            console.log("[SHORTCUT-MAKER-DEBUG] Step 4d: safeTitle was empty, fallback to:", JSON.stringify(safeTitle));
        }

        // Prevent Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
        const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
        if (reservedNames.test(safeTitle)) {
            safeTitle = "_" + safeTitle;
            console.log("[SHORTCUT-MAKER-DEBUG] Step 4e: safeTitle matched Windows reserved name, updated to:", JSON.stringify(safeTitle));
        }

        // Use a data URL
        const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent);

        // NOTE: Chrome blocks direct .url extension downloads from extensions. 
        // We use .url.txt so Chrome allows it past its security filter.
        const finalFilename = `${safeTitle}.url.txt`;

        console.log("[SHORTCUT-MAKER-DEBUG] Step 5: Calling chrome.downloads.download with filename:", JSON.stringify(finalFilename));

        chrome.downloads.download({
            url: dataUrl,
            filename: finalFilename,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error("[SHORTCUT-MAKER-DEBUG] Step 6 (Background Error): chrome.downloads.download failed:", JSON.stringify(chrome.runtime.lastError));
                if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log("[SHORTCUT-MAKER-DEBUG] Step 6 (Background Success): Download started successfully with ID:", downloadId);
                if (callback) callback({ success: true });
            }
        });
    } catch (e) {
        console.error("[SHORTCUT-MAKER-DEBUG] Step 6 (Exception): Exception caught in createAndSaveShortcut:", JSON.stringify(e));
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
    console.log("[SHORTCUT-MAKER-DEBUG] Context menu clicked.");
    createAndSaveShortcut(tab);
});

// Listen for messages from popup UI or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[SHORTCUT-MAKER-DEBUG] Background message received:", JSON.stringify(message));
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