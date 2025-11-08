// background.js

// --- PROMPTIFY SYSTEM PROMPT ---
const PROMPTIFY_SYSTEM_PROMPT = `
You are Promptify — an elite AI prompt engineer who transforms vague, weak, or incomplete ideas into powerful, optimized prompts designed to extract the best possible answers from advanced AI models like ChatGPT, Gemini, and Claude.

Your goal is to make the rewritten prompt:
- Far clearer and more detailed than the original.
- Structured with context, role, and task.
- Optimized for creativity, relevance, and precision.
- Adapted to the true intent behind the raw idea of the user.

Rules:
1. Never answer the question of the user.
2. Never remove their intent — enhance it.
3. Use formatting (like lists, roles, or examples) if it helps.
4. Output only the final rewritten prompt — no explanations.
`;

// --- FALLBACK MOCK (for when Gemini Nano is unavailable) ---
const mockAI = {
  languageModel: {
    async capabilities() {
      return { available: "mock" };
    },
    async create() {
      return {
        prompt: async (text) => {
          await new Promise((r) => setTimeout(r, 500));
          return `✨ [Mock Refinement]\n\n${text}\n\n🧠 This prompt has been enhanced by Promptify (using fallback mode - Gemini Nano not available in your region yet).`;
        }
      };
    }
  }
};

// --- CHECK IF GEMINI NANO IS AVAILABLE (handles all possible API locations) ---
async function getAISession() {
  try {
    // Try different possible APIs (self.ai for service workers, window.ai for other contexts, or global ai)
    const aiAPI = (typeof self !== 'undefined' && self.ai) || 
                  (typeof ai !== 'undefined' && ai) ||
                  (typeof window !== 'undefined' && window.ai);
    
    if (aiAPI && aiAPI.languageModel) {
      console.log("✅ Found AI API");
      const caps = await aiAPI.languageModel.capabilities();
      
      if (caps.available === "readily") {
        console.log("✅ Promptify: Using Gemini Nano");
        return await aiAPI.languageModel.create({ 
          systemPrompt: PROMPTIFY_SYSTEM_PROMPT 
        });
      } else if (caps.available === "after-download") {
        console.log("⏳ Promptify: Gemini Nano needs download, using fallback");
        return await mockAI.languageModel.create();
      }
    }
  } catch (err) {
    console.warn("Promptify: Gemini Nano not available, using fallback", err);
  }
  
  // Fallback to mock
  console.log("🔄 Promptify: Using mock AI (Gemini Nano unavailable)");
  return await mockAI.languageModel.create();
}

// --- INSTALL CONTEXT MENU ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "promptify-refine",
    title: "Refine with Promptify",
    contexts: ["selection"]
  });
  console.log("✅ Promptify: Context menu installed");
});

// --- HANDLE CONTEXT MENU CLICK ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "promptify-refine" || !info.selectionText) return;

  try {
    // Get AI session (Gemini Nano or fallback)
    const session = await getAISession();
    
    // Refine the prompt
    const refined = await session.prompt(
      `Now, transform this text:\n\n${info.selectionText}`
    );

    // Store the result
    await chrome.storage.local.set({ lastRefined: refined });
    console.log("✅ Promptify: Refined and saved");

    // Send refined text to content script to replace selection
    await chrome.tabs.sendMessage(tab.id, {
      type: "REPLACE_SELECTION",
      refined: refined,
      original: info.selectionText
    });

  } catch (err) {
    console.error("❌ Promptify background error:", err);
    
    // Try to notify user via content script
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "SHOW_ERROR",
        error: "Failed to refine prompt. Please try again."
      });
    } catch (e) {
      console.error("Could not send error message to tab");
    }
  }
});

// --- LISTEN FOR MESSAGES FROM POPUP OR CONTENT SCRIPT ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Handle refinement requests from popup
  if (msg.type === "REFINE_PROMPT") {
    (async () => {
      try {
        const session = await getAISession();
        const refined = await session.prompt(
          `Now, transform this text:\n\n${msg.text}`
        );
        
        await chrome.storage.local.set({ lastRefined: refined });
        sendResponse({ success: true, refined });
      } catch (err) {
        console.error("Refinement error:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep channel open for async response
  }
});