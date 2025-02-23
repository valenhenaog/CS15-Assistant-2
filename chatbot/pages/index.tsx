import { useState, useEffect, useRef } from "react";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { LuSendHorizontal } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import "../styles/globals.css";

interface Message {
  text: string;
  sender: "user" | "bot";
}

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Add an empty bot message placeholder
    setMessages((prev) => [...prev, { text: "", sender: "bot" }]);

    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let botReply = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        botReply += decoder.decode(value, { stream: true });

        // Update the last bot message progressively
        setMessages((prev) =>
          prev.map((msg, index) =>
            index === prev.length - 1 ? { ...msg, text: botReply } : msg
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Scroll to the bottom whenever messages update
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex items-center justify-center h-screen w-full bg-white">
      <div className="flex flex-col h-[90vh] w-full max-w-6xl p-4 bg-white rounded-lg shadow-lg">
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 flex flex-col">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 my-1 max-w-lg ${
                msg.sender === "user"
                  ? "bg-cyan-50 border-cyan-500 text-black self-end border-r-4 rounded-l"
                  : "border-cyan-50 text-black self-start border-l-4 rounded-r shadow"
              }`}
            >
              {msg.sender === "bot" ? (
                <div className="prose prose-headings:font-bold prose-headings:text-cyan-700 prose-p:mt-2 prose-p:mb-4 leading-relaxed">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                msg.text
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button onClick={sendMessage} className="bg-cyan-300 text-white">
            <LuSendHorizontal size="30px" />
          </Button>
        </div>
      </div>
    </div>
  );
}



// import { useState, useEffect, useRef } from "react";
// import { Input } from "../components/input";
// import { Button } from "../components/button";
// import { LuSendHorizontal } from "react-icons/lu";
// import ReactMarkdown from "react-markdown";
// import "../styles/globals.css";

// interface Message {
//   text: string;
//   sender: "user" | "bot";
// }

// const ChatApp: React.FC = () => {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const chatRef = useRef<HTMLDivElement>(null);

//   const sendMessage = async () => {
//     if (!input.trim()) return;

//     const userMessage: Message = { text: input, sender: "user" };
//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");
//     setLoading(true);

//     try {
//       const response = await fetch("/api", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ message: input }),
//       });

//       const data = await response.json();
//       const botMessage: Message = { text: data.reply, sender: "bot" };
//       setMessages((prev) => [...prev, botMessage]);
//     } catch (error) {
//       console.error("Error sending message:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (chatRef.current) {
//       chatRef.current.scrollTop = chatRef.current.scrollHeight;
//     }
//   }, [messages]);

//   return (
//     <div className="flex items-center justify-center h-screen w-full bg-white">
//       <div className="flex flex-col h-[90vh] w-full max-w-6xl p-4 bg-white rounded-lg">
//         <div ref={chatRef} className="flex-1 overflow-y-auto p-4 flex flex-col">
//           {messages.map((msg, index) => (
//             <div
//               key={index}
//               className={`p-2 my-1 max-w-lg ${
//                 msg.sender === "user"
//                   ? "bg-cyan-50 border-cyan-500 text-black self-end border-r-4 rounded-l"
//                   : "border-cyan-50 text-black self-start border-l-4 rounded-r shadow"
//               }`}
//             >
//               {msg.sender === "bot" ? (
//                 <div className="prose prose-sm">
//                   <ReactMarkdown>{msg.text}</ReactMarkdown>
//                 </div>
//               ) : (
//                 msg.text
//               )}
//             </div>
//           ))}

//           {loading && (
//             <div className="self-start p-2 my-1 rounded-lg bg-gray-300 text-black flex items-center gap-2">
//               <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
//               Thinking...
//             </div>
//           )}
//         </div>
//         <div className="mt-4 flex gap-2">
//           <Input
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             placeholder="Type a message..."
//             className="flex-1"
//             onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//           />
//           <Button onClick={sendMessage} className="bg-cyan-300 text-white">
//             <LuSendHorizontal size="30px" />
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChatApp;


// // import { useState, useEffect, useRef } from "react";
// // import { Input } from "../components/input";
// // import { Button } from "../components/button";
// // import { LuSendHorizontal } from "react-icons/lu";
// // import ReactMarkdown from "react-markdown";
// // import "../styles/globals.css";

// // // ✅ Add this interface at the top!
// // interface Message {
// //   text: string;
// //   sender: "user" | "bot";
// // }

// // export default function ChatApp() {
// //   const [messages, setMessages] = useState<Message[]>([]);
// //   const [input, setInput] = useState("");
// //   const chatRef = useRef<HTMLDivElement>(null);

// //   const sendMessage = async () => {
// //     if (!input.trim()) return;

// //     const userMessage: Message = { text: input, sender: "user" };
// //     setMessages((prev) => [...prev, userMessage]);
// //     setInput("");

// //     try {
// //       const response = await fetch("/api", {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({ message: input }),
// //       });

// //       const data = await response.json();
// //       const botMessage: Message = { text: data.reply, sender: "bot" };
// //       setMessages((prev) => [...prev, botMessage]);
// //     } catch (error) {
// //       console.error("Error sending message:", error);
// //     }
// //   };

// //   useEffect(() => {
// //     if (chatRef.current) {
// //       chatRef.current.scrollTop = chatRef.current.scrollHeight;
// //     }
// //   }, [messages]);

// //   return (
// //     <div className="flex items-center justify-center h-screen w-full bg-white">
// //       <div className="flex flex-col h-[90vh] w-full max-w-6xl p-4 bg-white rounded-lg">
// //         <div ref={chatRef} className="flex-1 overflow-y-auto p-4 flex flex-col">
// //           {messages.map((msg, index) => (
// //             <div
// //               key={index}
// //               className={`p-2 my-1 max-w-lg ${
// //                 msg.sender === "user"
// //                   ? "bg-cyan-50 border-cyan-500 text-black self-end border-r-4 rounded-l"
// //                   : "border-cyan-50 text-black self-start border-l-4 rounded-r shadow"
// //               }`}
// //             >
// //               {msg.sender === "bot" ? (
// //                 <div className="prose prose-sm">
// //                   <ReactMarkdown>{msg.text}</ReactMarkdown>
// //                 </div>
// //               ) : (
// //                 msg.text
// //               )}
// //             </div>
// //           ))}
// //         </div>
// //         <div className="mt-4 flex gap-2">
// //           <Input
// //             value={input}
// //             onChange={(e) => setInput(e.target.value)}
// //             placeholder="Type a message..."
// //             className="flex-1"
// //             onKeyDown={(e) => e.key === "Enter" && sendMessage()} // Enter submits message
// //           />
// //           <Button onClick={sendMessage} className="bg-cyan-300 text-white">
// //             <LuSendHorizontal size="30px"/>
// //           </Button>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }