// content.js

// Listen for messages from background script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  
  // Replace selected text with refined version
  if (msg.type === "REPLACE_SELECTION") {
    try {
      const sel = window.getSelection();
      
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(msg.refined));
        
        // Deselect after replacement
        sel.removeAllRanges();
      }

      // Copy to clipboard
      navigator.clipboard.writeText(msg.refined)
        .then(() => {
          showNotification("✅ Refined by Promptify (copied to clipboard)");
        })
        .catch(() => {
          showNotification("✅ Refined by Promptify");
        });

      sendResponse({ success: true });
    } catch (err) {
      console.error("Promptify content script error:", err);
      showNotification("❌ Failed to replace text");
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
  
  // Show error notification
  if (msg.type === "SHOW_ERROR") {
    showNotification("❌ " + msg.error);
    sendResponse({ success: true });
    return true;
  }
});

// Helper function to show user-friendly notifications
function showNotification(message) {
  // Create a floating notification element
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1f2937;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;

  // Add animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideIn 0.3s ease-out reverse";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

console.log("✅ Promptify content script loaded");