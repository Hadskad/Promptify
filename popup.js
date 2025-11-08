// popup.js

// --- MAIN LOGIC ---
document.addEventListener("DOMContentLoaded", async () => {
  const rewriteBtn = document.getElementById("rewriteBtn");
  const copyBtn = document.getElementById("copyBtn");
  const userPrompt = document.getElementById("userPrompt");
  const output = document.getElementById("output");
  const aboutBtn = document.getElementById("aboutBtn");

  // Load last refined prompt (if any)
  chrome.storage.local.get(["lastRefined"], (res) => {
    if (res.lastRefined) {
      output.value = res.lastRefined;
    }
  });

  // --- REFINE BUTTON ---
  rewriteBtn.addEventListener("click", async () => {
    const text = userPrompt.value.trim();
    if (!text) {
      alert("⚠️ Please enter a prompt first.");
      return;
    }

    rewriteBtn.disabled = true;
    rewriteBtn.textContent = "Refining…";
    output.value = "✨ Refining your prompt, please wait...";

    try {
      // Send refinement request to background script
      chrome.runtime.sendMessage(
        { type: "REFINE_PROMPT", text: text },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
            alert("❌ Connection error. Please try again.");
            output.value = "";
          } else if (response && response.success) {
            // Display refined prompt
            output.value = response.refined;
            console.log("✅ Promptify: Refinement successful");
          } else {
            alert("❌ Refinement failed: " + (response?.error || "Unknown error"));
            output.value = "";
          }

          rewriteBtn.disabled = false;
          rewriteBtn.textContent = "Refine Prompt";
        }
      );
    } catch (err) {
      console.error("Promptify (popup) error:", err);
      alert("❌ Refinement failed. See console for details.");
      output.value = "";
      rewriteBtn.disabled = false;
      rewriteBtn.textContent = "Refine Prompt";
    }
  });

  // --- COPY BUTTON ---
  copyBtn.addEventListener("click", async () => {
    if (!output.value.trim()) {
      alert("⚠️ Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      alert("✅ Copied to clipboard!");
    } catch {
      // Fallback for older browsers
      output.select();
      document.execCommand("copy");
      alert("✅ Copied (fallback method).");
    }
  });

  // --- ABOUT BUTTON ---
  aboutBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "about.html" });
  });
});