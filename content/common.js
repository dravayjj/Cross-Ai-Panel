class CrossAIController {
  constructor() {
    this.hostname = window.location.hostname;
    this.provider = this.detectProvider();
    this.activeBridgeContext = null;
    this.isWidgetOpen = false;
    this.scrapeTimeout = null;
    this.init();
  }

  detectProvider() {
    if (this.hostname.includes("chatgpt.com")) return "chatgpt";
    if (this.hostname.includes("claude.ai")) return "claude";
    if (this.hostname.includes("gemini.google.com")) return "gemini";
    return null;
  }

  init() {
    if (!this.provider) return;

    this.injectFloatingWidget();
    this.debouncedSync();

    const observer = new MutationObserver(() => {
      this.debouncedSync();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    this.checkActiveBridgeContext();
    this.attachInputInterceptor();
  }

  debouncedSync() {
    if (this.scrapeTimeout) clearTimeout(this.scrapeTimeout);
    this.scrapeTimeout = setTimeout(() => {
      if (!chrome.runtime?.id) return;
      this.extractNativeHistory();
      this.captureActiveChatContent();
    }, 2000);
  }

  captureActiveChatContent() {
    if (!chrome.runtime?.id) return;

    const pathSegments = window.location.href.split("/").filter(Boolean);
    const conversationId = pathSegments[pathSegments.length - 1];

    if (!conversationId || conversationId.includes("chatgpt.com") || conversationId.includes("claude.ai") || conversationId.includes("gemini.google.com")) return;

    const realMessages = this.scrapeActiveThreadMessages();
    if (realMessages.length === 0) return;

    const titleNode = document.querySelector("h1, title, header");
    const title = titleNode ? titleNode.innerText.split("\n")[0].trim() : "Active Conversation";

    chrome.runtime.sendMessage({
      action: "IMPORT_CONVERSATION",
      payload: {
        provider: this.provider,
        conversation_id: conversationId,
        title: title,
        url: window.location.href,
        messages: realMessages
      }
    });
  }

  extractNativeHistory() {
    if (!chrome.runtime?.id) return;

    let elements = [];
    if (this.provider === "chatgpt") {
      elements = Array.from(document.querySelectorAll("nav a[href*='/c/']"));
    } else if (this.provider === "claude") {
      elements = Array.from(document.querySelectorAll("div[data-testid='sidebar'] a[href*='/chat/'], nav a[href*='/chat/']"));
    } else if (this.provider === "gemini") {
      elements = Array.from(document.querySelectorAll("mat-sidenav a[href*='/app/'], side-navigation-v2 a, a[data-test-id='recent-conversation-item']"));
    }

    elements.forEach((link) => {
      if (!link || !link.href) return;
      const fullUrl = link.href;
      const title = (link.innerText || "").split("\n")[0].trim();
      if (!title || title === "New chat" || title === "UNIFIED AI HISTORY") return;

      const pathSegments = fullUrl.split("/").filter(Boolean);
      const conversationId = pathSegments[pathSegments.length - 1];
      if (!conversationId) return;

      chrome.runtime.sendMessage({
        action: "IMPORT_CONVERSATION",
        payload: {
          provider: this.provider,
          conversation_id: conversationId,
          title: title,
          url: fullUrl,
          messages: []
        }
      });
    });
  }

  scrapeActiveThreadMessages() {
    const extracted = [];
    try {
      if (this.provider === "chatgpt") {
        const nodes = document.querySelectorAll("div[data-message-author-role], article div.markdown");
        nodes.forEach(el => {
          const roleAttr = el.getAttribute("data-message-author-role");
          const role = roleAttr || "assistant";
          const text = el.innerText ? el.innerText.trim() : "";
          if (text) extracted.push({ role: role, content: text });
        });
      } else if (this.provider === "claude") {
        const nodes = document.querySelectorAll(".font-claude-message, .font-user-message, div[data-is-streaming='false']");
        nodes.forEach(el => {
          const role = el.classList.contains("font-user-message") ? "user" : "assistant";
          const text = el.innerText ? el.innerText.trim() : "";
          if (text) extracted.push({ role: role, content: text });
        });
      } else if (this.provider === "gemini") {
        const nodes = document.querySelectorAll("user-query, model-response, .query-text, .response-text");
        nodes.forEach(el => {
          const role = (el.tagName.toLowerCase().includes("user") || el.classList.contains("query-text")) ? "user" : "assistant";
          const text = el.innerText ? el.innerText.trim() : "";
          if (text) extracted.push({ role: role, content: text });
        });
      }
    } catch (e) {
      console.warn("[CrossAI] Scrape suppressed:", e);
    }
    return extracted;
  }

  injectFloatingWidget() {
    if (document.getElementById("crossai-floating-root")) return true;

    const root = document.createElement("div");
    root.id = "crossai-floating-root";
    root.style.cssText = "position: fixed; top: 120px; right: 0; z-index: 999999; display: flex; align-items: flex-start; font-family: sans-serif;";

    root.innerHTML = `
      <button id="crossai-tab-btn" style="background: #2563eb; color: #fff; border: none; padding: 10px 6px; border-radius: 8px 0 0 8px; cursor: pointer; font-weight: bold; font-size: 0.75rem; writing-mode: vertical-rl; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: -2px 0 8px rgba(0,0,0,0.3);">
        Cross-AI History
      </button>

      <div id="crossai-panel" style="width: 260px; background: #18181b; color: #f4f4f5; border: 1px solid #3f3f46; border-right: none; border-radius: 8px 0 0 8px; padding: 12px; display: none; box-shadow: -4px 0 16px rgba(0,0,0,0.4); max-height: 420px; overflow-y: auto;">
        <div style="font-size: 0.75rem; font-weight: bold; color: #a1a1aa; margin-bottom: 8px; text-transform: uppercase;">EXTERNAL CONTEXT</div>
        <div id="crossai-list">Loading external chats...</div>
      </div>
    `;

    document.body.appendChild(root);

    const btn = document.getElementById("crossai-tab-btn");
    const panel = document.getElementById("crossai-panel");

    btn.onclick = () => {
      this.isWidgetOpen = !this.isWidgetOpen;
      panel.style.display = this.isWidgetOpen ? "block" : "none";
      if (this.isWidgetOpen) this.refreshUnifiedList();
    };

    return true;
  }

  refreshUnifiedList() {
    if (!chrome.runtime?.id) return;

    chrome.runtime.sendMessage({ action: "FETCH_UNIFIED_HISTORY" }, (res) => {
      const listContainer = document.getElementById("crossai-list");
      if (!listContainer) return;

      if (!res || !res.success || !res.data) {
        listContainer.innerHTML = `<div style="font-size:0.75rem; color:#ef4444;">Backend offline</div>`;
        return;
      }

      const filteredData = res.data.filter(item => item.provider !== this.provider);
      if (filteredData.length === 0) {
        listContainer.innerHTML = `<div style="font-size:0.75rem; color:#a1a1aa; padding:4px 0;">No external AI histories recorded</div>`;
        return;
      }

      listContainer.innerHTML = "";
      filteredData.forEach((item) => {
        const el = document.createElement("div");
        el.className = "crossai-item";
        el.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:6px 8px; cursor:pointer; font-size:0.82rem; border-radius:4px; margin-bottom:4px; background: #27272a; transition: background 0.15s ease;";
        
        const badgeColor = item.provider === 'chatgpt' ? '#10a37f' : item.provider === 'claude' ? '#d97706' : '#2563eb';
        
        el.innerHTML = `
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 150px; color:#fff;">${item.title}</span>
          <span style="background:${badgeColor}; color:#fff; font-size:0.6rem; padding:2px 5px; border-radius:3px; font-weight:600; text-transform:uppercase; flex-shrink:0;">${item.provider}</span>
        `;

        el.onclick = () => {
          this.linkContextToCurrentPlatform(item);
          document.getElementById("crossai-panel").style.display = "none";
          this.isWidgetOpen = false;
        };

        listContainer.appendChild(el);
      });
    });
  }

  linkContextToCurrentPlatform(item) {
    this.activeBridgeContext = item;
    if (chrome.runtime?.id) {
      chrome.storage.local.set({ active_cross_context: item }, () => {
        this.renderBridgeBanner();
      });
    }
  }

  checkActiveBridgeContext() {
    if (!chrome.runtime?.id) return;
    chrome.storage.local.get(["active_cross_context"], (res) => {
      if (!res.active_cross_context) return;
      this.activeBridgeContext = res.active_cross_context;
      this.renderBridgeBanner();
    });
  }

  renderBridgeBanner() {
    let banner = document.getElementById("crossai-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "crossai-banner";
      banner.style.cssText = "background: rgba(16, 163, 127, 0.25); border: 1px solid #10a37f; padding: 8px 14px; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 99999; color: #fff;";
      document.body.prepend(banner);
    }

    banner.innerHTML = `
      <span>Linked External Context: <strong>${this.activeBridgeContext.title}</strong> (${this.activeBridgeContext.provider.toUpperCase()})</span>
      <button id="crossai-unlink" style="background:none; border:none; color:#fff; cursor:pointer; font-weight:bold;">✕ Unlink</button>
    `;

    document.getElementById("crossai-unlink").onclick = () => {
      if (chrome.runtime?.id) {
        chrome.storage.local.remove(["active_cross_context"]);
      }
      banner.remove();
      this.activeBridgeContext = null;
    };
  }

  /**
   * Dispatches virtual text files via File/DataTransfer for large contexts
   */
  uploadTextAsFile(inputEl, filename, content) {
    try {
      const blob = new Blob([content], { type: "text/plain" });
      const file = new File([blob], filename, { type: "text/plain" });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      const fileInput = document.querySelector("input[type='file']");
      if (fileInput) {
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    } catch (err) {
      console.warn("[CrossAI] File attachment fallback:", err);
    }
    return false;
  }

  attachInputInterceptor() {
    const selectors = {
      chatgpt: "#prompt-textarea",
      claude: "div[contenteditable='true']",
      gemini: "div[contenteditable='true'], rich-textarea div[contenteditable='true']"
    };

    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && this.activeBridgeContext) {
        const inputEl = document.querySelector(selectors[this.provider]);
        if (!inputEl) return;

        const activeEl = document.activeElement;
        if (!activeEl || (activeEl !== inputEl && !inputEl.contains(activeEl))) return;

        e.preventDefault();
        e.stopPropagation();

        const rawUserPrompt = inputEl.value !== undefined ? inputEl.value : inputEl.innerText;
        if (!rawUserPrompt.trim()) return;

        const linkedContext = this.activeBridgeContext;

        chrome.storage.local.remove(["active_cross_context"]);
        const banner = document.getElementById("crossai-banner");
        if (banner) banner.remove();
        this.activeBridgeContext = null;

        requestAnimationFrame(() => {
          chrome.runtime.sendMessage(
            {
              action: "RETRIEVE_CONTEXT",
              query: rawUserPrompt,
              target_provider: this.provider,
              conversation_id: linkedContext.conversation_id
            },
            (res) => {
              let contextText = res && res.context ? res.context : `Topic: ${linkedContext.title}`;

              // File Conversion Trigger: If text exceeds 3000 chars, upload as context.txt file
              if (contextText.length > 3000) {
                const uploaded = this.uploadTextAsFile(
                  inputEl,
                  `${linkedContext.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_context.txt`,
                  `EXTERNAL CONTEXT FROM ${linkedContext.provider.toUpperCase()} CHAT:\n${contextText}`
                );

                const promptText = `[REFERENCING ATTACHED FILE CONTEXT FOR "${linkedContext.title}"]:\n${rawUserPrompt}`;
                if (inputEl.value !== undefined) {
                  inputEl.value = promptText;
                } else {
                  inputEl.innerText = promptText;
                }
              } else {
                const fullPrompt = `[EXTERNAL CONTEXT FROM ${linkedContext.provider.toUpperCase()} CONVERSATION "${linkedContext.title}"]:\n${contextText}\n\n[USER INSTRUCTION]:\n${rawUserPrompt}\n\n(IMPORTANT: Answer the user's question directly using the external context above.)`;

                if (inputEl.value !== undefined) {
                  inputEl.value = fullPrompt;
                } else {
                  inputEl.innerText = fullPrompt;
                }
              }

              inputEl.dispatchEvent(new Event("input", { bubbles: true }));

              setTimeout(() => {
                const submitBtn = document.querySelector("button[data-testid='send-button'], button[aria-label='Send message'], button[aria-label='Send prompt'], button.send-button");
                if (submitBtn) {
                  submitBtn.click();
                } else {
                  inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
                }
              }, 100);
            }
          );
        });
      }
    }, true);
  }
}

new CrossAIController();