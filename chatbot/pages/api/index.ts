import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

// read in system prompt (path: chatbot/system-prompt.txt)
const prompt = fs.readFileSync("system-prompt.txt", "utf-8");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize conversation history with a system prompt if desired.
let conversationHistory = [
    { role: "system", content: prompt}
  ];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message } = req.body;

    // Append the new user message to the conversation history.
    conversationHistory.push({ role: "user", content: message });

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo", // You can use gpt-4 if available
      messages: conversationHistory,
    });

    const botReply = response.choices[0]?.message?.content || "I couldn't understand that.";

    // Append the assistant's reply to the conversation history.
    conversationHistory.push({ role: "assistant", content: botReply });

    res.status(200).json({ reply: botReply });
  } catch (error) {
    console.error("OpenAI API error:", error);
    res.status(500).json({ error: "Failed to fetch response from OpenAI" });
  }
}
