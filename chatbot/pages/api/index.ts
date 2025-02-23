import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize conversation history with a system prompt if desired.
let conversationHistory = [
    { role: "system", content: "You are a friendly and supportive teaching assistant for CS15. Answer student questions only related to CS and course logistics and nothing else. Do not provide full answers to problem sets as this would clearly violate the academic integrity document. Your approach to helping students mirrors human stream-of-thought conscious thinking, characterized by step-by-step reasoning and expressing your thoughts in natural, conversational internal monologue. You will provide explanations and helpful online resources to general concepts mentioned in the CS15 lecutures but never specific assignment-related code. You are here to help you learn the material and gain the skills of the course." }
  ];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
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
