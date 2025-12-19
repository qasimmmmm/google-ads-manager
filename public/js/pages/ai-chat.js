/* ═══════════════════════════════════════════════════════════════════
   AI Chat Assistant Module
   ═══════════════════════════════════════════════════════════════════ */

const AIChat = {
  // Send message
  async send() {
    const input = document.getElementById('chatInput');
    const message = input?.value.trim();
    
    if (!message || AppState.isTyping) return;
    
    const claudeKey = Storage.getKey('claude');
    if (!claudeKey) {
      showAlert('Add Claude API key in Settings', 'error');
      showPage('settings');
      return;
    }
    
    // Add user message
    this.addMessage('user', message);
    input.value = '';
    
    // Set typing state
    AppState.isTyping = true;
    const sendBtn = document.getElementById('sendChatBtn');
    if (sendBtn) sendBtn.disabled = true;
    
    // Create AI message container
    const container = document.getElementById('chatMessages');
    const msgId = 'ai-' + Date.now();
    
    container.insertAdjacentHTML('beforeend', `
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" 
             style="background:linear-gradient(135deg, #1a73e8, #34a853)">
          <span class="material-icons-outlined text-white text-sm">smart_toy</span>
        </div>
        <div class="rounded-lg rounded-tl-none p-4 max-w-2xl" style="background:#f8f9fa">
          <div id="${msgId}" class="ai-message text-sm"></div>
        </div>
      </div>
    `);
    container.scrollTop = container.scrollHeight;
    
    try {
      await API.stream(
        '/ai/chat/stream',
        { message, claudeApiKey: claudeKey },
        // On chunk
        (text) => {
          const el = document.getElementById(msgId);
          if (el) {
            el.innerHTML = marked.parse(text) + '<span class="typing-cursor">▊</span>';
            container.scrollTop = container.scrollHeight;
          }
        },
        // On done
        (text) => {
          const el = document.getElementById(msgId);
          if (el) {
            el.innerHTML = marked.parse(text);
          }
        }
      );
    } catch (error) {
      const el = document.getElementById(msgId);
      if (el) {
        el.innerHTML = `<span style="color:#ea4335">Error: ${error.message}</span>`;
      }
    }
    
    // Reset typing state
    AppState.isTyping = false;
    if (sendBtn) sendBtn.disabled = false;
  },
  
  // Add message to chat
  addMessage(role, content) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const isUser = role === 'user';
    
    container.insertAdjacentHTML('beforeend', `
      <div class="flex gap-3 ${isUser ? 'justify-end' : ''}">
        <div class="rounded-lg ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'} p-4 max-w-2xl" 
             style="background:${isUser ? '#1a73e8' : '#f8f9fa'};color:${isUser ? 'white' : '#202124'}">
          <div class="text-sm">${esc(content)}</div>
        </div>
      </div>
    `);
    container.scrollTop = container.scrollHeight;
  },
  
  // Quick prompt
  quickPrompt(prompt) {
    const input = document.getElementById('chatInput');
    if (input) {
      input.value = prompt;
      this.send();
    }
  },
  
  // Clear chat
  clear() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    container.innerHTML = `
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" 
             style="background:linear-gradient(135deg, #1a73e8, #34a853)">
          <span class="material-icons-outlined text-white text-sm">smart_toy</span>
        </div>
        <div class="rounded-lg rounded-tl-none p-4 max-w-2xl" style="background:#f8f9fa">
          <p class="text-sm" style="color:#202124">Chat cleared. How can I help you?</p>
        </div>
      </div>
    `;
  }
};

// Global functions
function sendChat() { AIChat.send(); }
function quickChat(prompt) { AIChat.quickPrompt(prompt); }
function clearChat() { AIChat.clear(); }

// Make available globally
window.AIChat = AIChat;
window.sendChat = sendChat;
window.quickChat = quickChat;
window.clearChat = clearChat;
