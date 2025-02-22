import { useState } from "react";
import { Input } from "../components/input";
import { Button } from "../components/button";

interface Message {
  text: string;
  sender: "user" | "bot";
}

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      const botMessage: Message = { text: data.reply, sender: "bot" };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-100 max-w-md mx-auto">
      <div className="flex-1 overflow-y-auto bg-white p-4 rounded shadow-md">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 my-1 rounded-lg max-w-xs ${
              msg.sender === "user" ? "bg-blue-500 text-white self-end" : "bg-gray-300 text-black self-start"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button onClick={sendMessage} className="bg-blue-600 text-white">
          Send
        </Button>
      </div>
    </div>
  );
}