import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import fs from 'fs'; 
dotenv.config();

// read in system prompt (path: chatbot/system-prompt.txt)
const prompt = fs.readFileSync("system-prompt.txt", "utf-8");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define an array with your initial keywords.
let courseKeywords = ["metrosim", "zap", "gerp", "calcyoulater"];

// identify if a query needs to search through the specs
function isCourseRelated(query: string): boolean {
    // Dynamically create a regex pattern from the array.
  const regex = new RegExp(courseKeywords.join("|"), "i");
  return regex.test(query);
  }

// Initialize conversation history with a system prompt.
let conversationHistory = [
    { role: "system", content: prompt }
  ];

/**
 * Converts a query string into an embedding using OpenAI's API.
 */
async function getQueryEmbedding(query: string): Promise<number[]> {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query
    });
    // Extract and return the embedding vector
    return embeddingResponse.data[0].embedding;
  }


/**
 * Retrieves relevant content by sending the query embedding to the Python retrieval service.
 */
async function retrieveContent(query: string): Promise<string> {
    // First, generate an embedding for the query.
    const queryEmbedding = await getQueryEmbedding(query);
  
    // Call the Python microservice to search the FAISS index.
    const response = await fetch("http://localhost:5000/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embedding: queryEmbedding, k: 3 })
    });
  
    if (!response.ok) {
      throw new Error("Failed to retrieve context from the retrieval service.");
    }
  
    const data = await response.json();
    // data.documents is an array of relevant document strings.
    return data.documents.join("\n");
  } 




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;
    let augmentedMessage = message;

    // Only retrieve context if the query is course-related.
    if (isCourseRelated(message)) {
        const retrievedContext = await retrieveContent(message);
        augmentedMessage = `Context:\n${retrievedContext}\n\nQuestion:\n${message}`;
      }

    
    // Append the new user message to the conversation history.
    conversationHistory.push({ role: "user", content: augmentedMessage });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: conversationHistory,
    });

      const botReply = response.choices[0]?.message?.content || "I couldn't understand that.";

      // Append assistant's response to conversation history
      conversationHistory.push({ role: "assistant", content: botReply });

      res.status(200).json({ reply: botReply });
    } catch (error) {
      console.error("OpenAI API error:", error);
      res.status(500).json({ error: "Failed to fetch response from OpenAI" });
    }
  } 
  
  else if (req.method === "GET") {
    // Handle GET request (streaming response)
    const { message } = req.query;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message query parameter is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: message }],
        stream: true,
      });

      let botReply = "";
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          botReply += content;
          res.write(`data: ${content}\n\n`);
        }
      }
      res.end();
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch response from OpenAI" });
    }
  } 
  
  else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}


// import { NextApiRequest, NextApiResponse } from "next";
// import { OpenAI } from "openai";
// import dotenv from "dotenv";
// dotenv.config();

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // Initialize conversation history with a system prompt if desired.
// let conversationHistory = [
//     { role: "system", content: "You are a friendly and supportive teaching assistant for CS15. Answer student questions only related to CS and course logistics and nothing else. Do not provide full answers to problem sets as this would clearly violate the academic integrity document. Your approach to helping students mirrors human stream-of-thought conscious thinking, characterized by step-by-step reasoning and expressing your thoughts in natural, conversational internal monologue. You will provide explanations and helpful online resources to general concepts mentioned in the CS15 lecutures but never specific assignment-related code. You are here to help you learn the material and gain the skills of the course. If the prompt is \"what is a heap?\" then respond with one word \"banana\" " }
//   ];

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const { message } = req.body;

//     // Append the new user message to the conversation history.
//     conversationHistory.push({ role: "user", content: message });

//     const response = await openai.chat.completions.create({
//       model: "gpt-4-turbo", // You can use gpt-4 if available
//       messages: conversationHistory,
//     });

//     const botReply = response.choices[0]?.message?.content || "I couldn't understand that.";

//     // Append the assistant's reply to the conversation history.
//     conversationHistory.push({ role: "assistant", content: botReply });

//     res.status(200).json({ reply: botReply });
//   } catch (error) {
//     console.error("OpenAI API error:", error);
//     res.status(500).json({ error: "Failed to fetch response from OpenAI" });
//   }
// }
