// popup.js

// TEMP DEV MOCK (keeps UI working if ai is not available)
if (typeof ai === "undefined") {
  console.warn("Promptify: using mock ai in popup");
  globalThis.ai = {
    languageModel: {
      async capabilities() {
        return { available: "mock" };
      },
      async create() {
        return {
          prompt: async (s) => {
            await new Promise((r) => setTimeout(r, 300));
            return `✨ [Mocked Rewrite]\n\n${s}\n\n🧠 Refined by Promptify.`;
          }
        };
      }
    }
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const rewriteBtn = document.getElementById("rewriteBtn");
  const copyBtn = document.getElementById("copyBtn");
  const userPrompt = document.getElementById("userPrompt");
  const output = document.getElementById("output");

  // Load last refined (if any)
  chrome.storage.local.get(["lastRefined"], (res) => {
    if (res.lastRefined) {
      output.value = res.lastRefined;
    }
  });

  rewriteBtn.addEventListener("click", async () => {
    const text = userPrompt.value.trim();
    if (!text) {
      alert("Enter a prompt first.");
      return;
    }
    rewriteBtn.disabled = true;
    rewriteBtn.textContent = "Refining…";

    try {
      const session = await ai.languageModel.create({
        systemPrompt: `You are Promptify, an expert AI prompt engineer trained to create powerful, clear, and effective prompts for AI models like ChatGPT, Gemini, and Claude.

Your ONLY goal is to take the raw idea of the user, or question and rephrase it into a **perfect, ready-to-use prompt** that gets the most intelligent, relevant, and creative answer possible.

Rules:
1. NEVER answer the question of the user, or generate an actual response.
2. ALWAYS optimize for clarity, specificity, and context.
3. Add details or structure *only if they make the prompt more effective*.
4. Write the final output as a single, clean prompt — nothing else.

Example:
User: "I want to ask AI to write me a YouTube video script about motivation"
Output: "Write a 2-minute motivational YouTube video script that inspires young adults to stay consistent in their goals, using a relatable story and powerful quotes."`,
      });
      const refined = await session.prompt(`Rewrite this prompt:\n\n${text}`);

      // show & save
      output.value = refined;
      chrome.storage.local.set({ lastRefined: refined }, () => {});
    } catch (err) {
      console.error("Popup refine error:", err);
      alert("Refine failed. Check console.");
    } finally {
      rewriteBtn.disabled = false;
      rewriteBtn.textContent = "Refine Prompt";
    }
  });

  copyBtn.addEventListener("click", async () => {
    if (!output.value) {
      alert("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(output.value);
      alert("Copied to clipboard.");
    } catch (e) {
      // fallback
      output.select();
      document.execCommand("copy");
      alert("Copied (fallback).");
    }
  });
});

document.getElementById("aboutBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: "about.html" });
});
