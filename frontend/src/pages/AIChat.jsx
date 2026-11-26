import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import {
  chatWithShelfLife,
} from "../services/aiService";

function AIChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi! I'm **ShelfLife AI**. Ask me about your pantry, expiry dates, meal ideas, or food waste.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  const quickQuestions = [
    {
      label: "⏱️ What should I eat first?",
      message: "What should I eat first?",
    },
    {
      label: "🍳 What can I make?",
      message: "What can I make with what I have?",
    },
    {
      label: "⚠️ What is expiring soon?",
      message: "What food is expiring soon?",
    },
    {
      label: "🗑️ How am I wasting food?",
      message: "How am I wasting food?",
    },
  ];

  // Automatically move to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const handleSend = async (customMessage = null) => {
    const messageToSend =
      customMessage || input.trim();

    if (!messageToSend || loading) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: messageToSend,
    };

    setMessages((previousMessages) => [
      ...previousMessages,
      userMessage,
    ]);

    setInput("");
    setError("");
    setLoading(true);

    try {
      const data = await chatWithShelfLife(
        messageToSend
      );

      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.reply,
      };

      setMessages((previousMessages) => [
        ...previousMessages,
        aiMessage,
      ]);
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "ShelfLife AI could not respond."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSend();
    }
  };

  return (
    <main className="app">
      <section className="ai-chat-page">

        <div className="ai-chat-header">
          <h1>✨ ShelfLife AI</h1>

          <p>
            Ask questions using your pantry,
            expiry data and food history.
          </p>
        </div>

        {/* QUICK QUESTIONS */}

        <div className="quick-questions">
          {quickQuestions.map((question) => (
            <button
              key={question.message}
              onClick={() =>
                handleSend(question.message)
              }
              disabled={loading}
            >
              {question.label}
            </button>
          ))}
        </div>

        {/* CHAT */}

        <div className="ai-chat-container">

          <div className="ai-messages">

            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "chat-message user-message"
                    : "chat-message assistant-message"
                }
              >

                <div className="message-label">
                  {message.role === "user"
                    ? "You"
                    : "✨ ShelfLife AI"}
                </div>

                <div className="message-bubble">

                  {message.role ===
                  "assistant" ? (
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    message.content
                  )}

                </div>

              </div>
            ))}

            {/* THINKING */}

            {loading && (
              <div className="chat-message assistant-message">

                <div className="message-label">
                  ✨ ShelfLife AI
                </div>

                <div className="message-bubble ai-thinking">

                  <span></span>
                  <span></span>
                  <span></span>

                </div>

              </div>
            )}

            <div ref={messagesEndRef} />

          </div>

          {error && (
            <div className="chat-error">
              {error}
            </div>
          )}

          {/* INPUT */}

          <div className="chat-input-area">

            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask ShelfLife AI..."
              rows="1"
              disabled={loading}
            />

            <button
              onClick={() => handleSend()}
              disabled={
                !input.trim() || loading
              }
            >
              Send
            </button>

          </div>

        </div>

      </section>
    </main>
  );
}

export default AIChat;