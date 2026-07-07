import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  sender: 'user' | 'companion';
  text: string;
}

export const CivicCompanionChat: React.FC = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Mock API call to Node.js backend
      const response = await fetch('/api/civic-companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text }),
      });
      const data = await response.json();

      const companionMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'companion',
        text: data.reply || t('chat.error_fallback'),
      };
      setMessages((prev) => [...prev, companionMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'companion',
          text: t('chat.connection_error'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section 
      className="civic-chat-container" 
      aria-label={t('chat.section_label')}
    >
      <header className="chat-header">
        <h1>{t('chat.title')}</h1>
        <p>{t('chat.subtitle')}</p>
      </header>

      {/* Accessible message log */}
      <div 
        className="message-log" 
        role="log" 
        aria-live="polite"
        aria-label={t('chat.log_label')}
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message-bubble ${msg.sender}`}
            aria-label={`${t(`chat.sender.${msg.sender}`)}: ${msg.text}`}
          >
            <span className="sender-tag" aria-hidden="true">
              {t(`chat.sender.${msg.sender}`)}
            </span>
            <p>{msg.text}</p>
          </div>
        ))}
        {loading && (
          <div className="loading-indicator" role="status" aria-live="assertive">
            <span>{t('chat.loading')}</span>
          </div>
        )}
      </div>

      {/* Input submission form */}
      <form onSubmit={handleSendMessage} className="chat-input-form">
        <label htmlFor="civic-chat-input" className="sr-only">
          {t('chat.input_placeholder')}
        </label>
        <input
          id="civic-chat-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t('chat.input_placeholder')}
          disabled={loading}
          aria-required="true"
          required
        />
        <button type="submit" disabled={loading || !inputValue.trim()}>
          {t('chat.send_button')}
        </button>
      </form>
    </section>
  );
};
