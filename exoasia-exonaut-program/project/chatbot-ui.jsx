// Exonaut AI chatbot — floating popup with dummy responses.
// Phase 2 will swap sendMessage() to call the real Edge Function.

(function () {
  const WELCOME = {
    id: 'welcome',
    role: 'assistant',
    content: "Hi! I'm EXO-BOT. Ask me anything about the program — missions, badges, rituals, how points work, and more.",
    time: new Date().toISOString(),
  };

  const DUMMY_RESPONSES = [
    "I'm still being set up! Once the backend is live, I'll be able to answer your program questions in real time.",
    "Great question! I'll be fully operational soon — the knowledge base is being compiled.",
    "That's something I'll be able to help with once the AI backend is connected. Stay tuned!",
  ];

  let dummyIdx = 0;

  async function sendMessage(message, conversationId) {
    const token = localStorage.getItem('sb-vkiikgsxhymnymacwygr-auth-token');
    if (!token) throw new Error('Not authenticated');
    const parsed = JSON.parse(token);
    const accessToken = parsed.access_token;

    const res = await fetch('https://vkiikgsxhymnymacwygr.supabase.co/functions/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, conversationId }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Chat API error');
    }

    return res.json();
  }

  function TypingDots() {
    return (
      <div className="chatbot-typing">
        <span /><span /><span />
      </div>
    );
  }

  function MessageBubble({ msg }) {
    const isUser = msg.role === 'user';
    return (
      <div className={'chatbot-msg ' + (isUser ? 'user' : 'assistant')}>
        {!isUser && (
          <div className="chatbot-msg-avatar">
            <i className="fa-solid fa-robot" />
          </div>
        )}
        <div className="chatbot-msg-bubble">
          {msg.content}
        </div>
      </div>
    );
  }

  function ChatbotPopup({ onClose }) {
    const [messages, setMessages] = React.useState([WELCOME]);
    const [input, setInput] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const bottomRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const conversationId = React.useRef('conv-' + Date.now());

    React.useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    React.useEffect(() => {
      inputRef.current?.focus();
    }, []);

    async function handleSend() {
      const text = input.trim();
      if (!text || loading) return;
      const userMsg = { id: 'u-' + Date.now(), role: 'user', content: text, time: new Date().toISOString() };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setLoading(true);
      try {
        const result = await sendMessage(text, conversationId.current);
        const aiMsg = { id: 'a-' + Date.now(), role: 'assistant', content: result.content, time: new Date().toISOString() };
        setMessages(prev => [...prev, aiMsg]);
      } catch {
        const errMsg = { id: 'e-' + Date.now(), role: 'assistant', content: 'Something went wrong. Please try again.', time: new Date().toISOString() };
        setMessages(prev => [...prev, errMsg]);
      } finally {
        setLoading(false);
      }
    }

    function handleKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }

    return (
      <div className="chatbot-popup">
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-header-icon"><i className="fa-solid fa-robot" /></div>
            <div>
              <div className="chatbot-header-title">EXO-BOT</div>
              <div className="chatbot-header-sub">Program Assistant</div>
            </div>
          </div>
          <button className="chatbot-close" onClick={onClose} title="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="chatbot-messages">
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {loading && (
            <div className="chatbot-msg assistant">
              <div className="chatbot-msg-avatar"><i className="fa-solid fa-robot" /></div>
              <div className="chatbot-msg-bubble"><TypingDots /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chatbot-input-area">
          <textarea
            ref={inputRef}
            className="chatbot-input"
            placeholder="Ask about missions, badges, points…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            disabled={loading}
          />
          <button
            className="chatbot-send"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            title="Send"
          >
            <i className="fa-solid fa-paper-plane" />
          </button>
        </div>
      </div>
    );
  }

  function Chatbot() {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        {open && <ChatbotPopup onClose={() => setOpen(false)} />}
        <button
          className="floating-action floating-chatbot"
          onClick={() => setOpen(v => !v)}
          title="EXO-BOT"
          style={{
            position: 'fixed', bottom: 20, right: 136, zIndex: 140,
            background: open ? 'var(--accent)' : 'var(--bg-darkest)',
            color: open ? 'var(--on-accent)' : 'var(--accent)',
            border: '1.5px solid var(--accent)',
            borderRadius: '50%', width: 48, height: 48,
            display: 'grid', placeItems: 'center', fontSize: 16,
            boxShadow: open ? 'var(--accent-glow)' : '0 2px 12px rgba(0,0,0,0.4)',
            cursor: 'pointer', transition: 'all 0.18s ease',
          }}
        >
          <i className={'fa-solid ' + (open ? 'fa-xmark' : 'fa-robot')} />
        </button>
      </>
    );
  }

  window.Chatbot = Chatbot;
})();
