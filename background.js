const API_BASE = "https://cross-ai-panel-3.onrender.com/api/v1";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_UNIFIED_HISTORY") {
    fetch(`${API_BASE}/conversations/unified`)
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));
    return true;
  }

  if (request.action === "IMPORT_CONVERSATION") {
    fetch(`${API_BASE}/sync/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.payload)
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));
    return true;
  }

  if (request.action === "RETRIEVE_CONTEXT") {
    fetch(`${API_BASE}/search/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: request.query,
        target_provider: request.target_provider,
        active_conversation_id: request.conversation_id
      })
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, context: data.context }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));
    return true;
  }
});
