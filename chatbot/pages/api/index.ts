import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});
//const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo", // You can use gpt-4 if available
      messages: [{ role: "user", content: message }],
    });

    const botReply = response.choices[0]?.message?.content || "I couldn't understand that.";

    res.status(200).json({ reply: botReply });
  } catch (error) {
    console.error("OpenAI API error:", error);
    res.status(500).json({ error: "Failed to fetch response from OpenAI" });
  }
}
