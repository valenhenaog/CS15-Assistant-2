import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import fs from 'fs';
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

// read in system prompt
const prompt = fs.readFileSync("system-prompt.txt", "utf-8");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define an array with your initial keywords
let courseKeywords = ["metrosim", "zap", "gerp", "calcyoulater"];

// identify if a query needs to search through the specs
function isCourseRelated(query: string): boolean {
  // Dynamically create a regex pattern from the array
  const regex = new RegExp(courseKeywords.join("|"), "i");
  return regex.test(query);
}

// Initialize conversation history with a system prompt
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
  // First, generate an embedding for the query
  const queryEmbedding = await getQueryEmbedding(query);
  
  // Call the Python microservice to search the FAISS index
  const response = await fetch("http://localhost:5050/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embedding: queryEmbedding, k: 3 })
  });
  
  if (!response.ok) {
    throw new Error("Failed to retrieve context from the retrieval service.");
  }
  
  const data = await response.json();
  // data.documents is an array of relevant document strings
  return data.documents.join("\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Set headers for streaming response
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { message } = req.body;
    let augmentedMessage = message;

    // Only retrieve context if the query is course-related
    if (isCourseRelated(message)) {
      try {
        const retrievedContext = await retrieveContent(message);
        augmentedMessage = `Context:\n${retrievedContext}\n\nQuestion:\n${message}`;
      } catch (error) {
        console.error("Error retrieving context:", error);
        // Continue with original message if context retrieval fails
      }
    }

    // Append the new user message to the conversation history
    conversationHistory.push({ role: "user", content: augmentedMessage });

    // Create a streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversationHistory,
      stream: true,
    });

    let fullResponse = '';

    // Process each chunk from the stream
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // Send each chunk to the client and flush immediately
        res.write(content);
        res.flush?.(); // Force the chunk to be sent immediately
        fullResponse += content;
        
        // Add a small delay to make streaming more visible
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }

    // Append assistant's complete response to conversation history
    conversationHistory.push({ role: "assistant", content: fullResponse });
    
    // End the response
    res.end();
  } catch (error) {
    console.error("OpenAI API error:", error);
    res.write("Sorry, an error occurred while processing your request.");
    res.end();
  }
}


// import { NextApiRequest, NextApiResponse } from "next";
// import { OpenAI } from "openai";
// import fs from "fs";

// import dotenv from "dotenv";
// import path from "path";

// dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

// // Load system prompt
// const prompt = fs.readFileSync("system-prompt.txt", "utf-8");

// // Initialize OpenAI client
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// // Course keywords trigger document retrieval
// const courseKeywords = ["metrosim", "zap", "gerp", "calcyoulater"];

// function isCourseRelated(query: string): boolean {
//   const regex = new RegExp(courseKeywords.join("|"), "i");
//   return regex.test(query);
// }

// // System + conversation history
// let conversationHistory = [
//   { role: "system", content: prompt },
// ];

// // Embedding function
// async function getQueryEmbedding(query: string): Promise<number[]> {
//   const response = await openai.embeddings.create({
//     model: "text-embedding-ada-002",
//     input: query,
//   });
//   return response.data[0].embedding;
// }

// // Document retrieval call
// async function retrieveContent(query: string): Promise<string> {
//   const queryEmbedding = await getQueryEmbedding(query);

//   const response = await fetch("http://localhost:5050/search", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ embedding: queryEmbedding, k: 3 }),
//   });

//   if (!response.ok) {
//     throw new Error("Failed to retrieve context from the retrieval service.");
//   }

//   const data = await response.json();
//   return data.documents.join("\n");
// }

// // Main request handler
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const { message } = req.body;
//     let augmentedMessage = message;

//     console.log("📝 Incoming message:", message);

//     if (isCourseRelated(message)) {
//       console.log("📚 Message is course-related — retrieving context...");
//       const retrievedContext = await retrieveContent(message);
//       console.log("📄 Retrieved context:", retrievedContext.slice(300, 500));
//       augmentedMessage = `Context:\n${retrievedContext}\n\nQuestion:\n${message}`;
//     } else {
//       console.log("📭 Message is not course-related, skipping retrieval.");
//     }

//     conversationHistory.push({ role: "user", content: augmentedMessage });

//     const response = await openai.chat.completions.create({
//       model: "gpt-4o",
//       messages: conversationHistory,
//     });

//     const botReply = response.choices[0]?.message?.content || "I couldn't understand that.";
//     conversationHistory.push({ role: "assistant", content: botReply });

//     res.status(200).json({ reply: botReply });
//   } catch (error) {
//     console.error("OpenAI API error:", error);
//     res.status(500).json({ error: "Failed to fetch response from OpenAI" });
//   }
// }


// import { NextApiRequest, NextApiResponse } from "next";
// import { OpenAI } from "openai";
// import fs from 'fs'; 

// // read in system prompt (path: chatbot/system-prompt.txt)
// const prompt = fs.readFileSync("system-prompt.txt", "utf-8");

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// // Define an array with your initial keywords.
// let courseKeywords = ["metrosim", "zap", "gerp", "calcyoulater"];

// // identify if a query needs to search through the specs
// function isCourseRelated(query: string): boolean {
//     // Dynamically create a regex pattern from the array.
//   const regex = new RegExp(courseKeywords.join("|"), "i");
//   return regex.test(query);
//   }

// // Initialize conversation history with a system prompt.
// let conversationHistory = [
//     { role: "system", content: prompt }
//   ];

// /**
//  * Converts a query string into an embedding using OpenAI's API.
//  */
// async function getQueryEmbedding(query: string): Promise<number[]> {
//     const embeddingResponse = await openai.embeddings.create({
//       model: "text-embedding-ada-002",
//       input: query
//     });
//     // Extract and return the embedding vector
//     return embeddingResponse.data[0].embedding;
//   }


// /**
//  * Retrieves relevant content by sending the query embedding to the Python retrieval service.
//  */
// async function retrieveContent(query: string): Promise<string> {
//     // First, generate an embedding for the query.
//     const queryEmbedding = await getQueryEmbedding(query);
  
//     // Call the Python microservice to search the FAISS index.
//     const response = await fetch("http://localhost:5050/search", { //CHANGED FROM 5000 to 5050
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ embedding: queryEmbedding, k: 3 })
//     });

//     console.log("📡 Retrieval service status:", response.status);
//     console.log("📦 Request body length:", JSON.stringify({ embedding: queryEmbedding, k: 3 }).length);
//     console.log("🔁 Headers:", response.headers);
  
//     if (!response.ok) {
//       throw new Error("Failed to retrieve context from the retrieval service.");
//     }
  
//     const data = await response.json();
//     // data.documents is an array of relevant document strings.
//     return data.documents.join("\n");
//   } 




// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const { message } = req.body;
//     let augmentedMessage = message;

//     // Only retrieve context if the query is course-related.
//     if (isCourseRelated(message)) {
//         const retrievedContext = await retrieveContent(message);
//         augmentedMessage = `Context:\n${retrievedContext}\n\nQuestion:\n${message}`;
//       }

    
//     // Append the new user message to the conversation history.
//     conversationHistory.push({ role: "user", content: augmentedMessage });

//     const response = await openai.chat.completions.create({
//       model: "gpt-4o", 
//       messages: conversationHistory,
//     });

//       const botReply = response.choices[0]?.message?.content || "I couldn't understand that.";

//       // Append assistant's response to conversation history
//       conversationHistory.push({ role: "assistant", content: botReply });

//       res.status(200).json({ reply: botReply });
//     } catch (error) {
//       console.error("OpenAI API error:", error);
//       res.status(500).json({ error: "Failed to fetch response from OpenAI" });
//     }
//   } 

// // import { NextApiRequest, NextApiResponse } from "next";
// // import { OpenAI } from "openai";
// // import dotenv from "dotenv";
// // import fs from 'fs'; 
// // dotenv.config();

// // // read in system prompt (path: chatbot/system-prompt.txt)
// // const prompt = fs.readFileSync("system-prompt.txt", "utf-8");

// // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // // Define an array with your initial keywords.
// // let courseKeywords = ["metrosim", "zap", "gerp", "calcyoulater"];

// // // identify if a query needs to search through the specs
// // function isCourseRelated(query: string): boolean {
// //     // Dynamically create a regex pattern from the array.
// //   const regex = new RegExp(courseKeywords.join("|"), "i");
// //   return regex.test(query);
// //   }

// // // Initialize conversation history with a system prompt.
// // let conversationHistory = [
// //     { role: "system", content: prompt }
// //   ];

// // /**
// //  * Converts a query string into an embedding using OpenAI's API.
// //  */
// // async function getQueryEmbedding(query: string): Promise<number[]> {
// //     const embeddingResponse = await openai.embeddings.create({
// //       model: "text-embedding-ada-002",
// //       input: query
// //     });
// //     // Extract and return the embedding vector
// //     return embeddingResponse.data[0].embedding;
// //   }


// // /**
// //  * Retrieves relevant content by sending the query embedding to the Python retrieval service.
// //  */
// // async function retrieveContent(query: string): Promise<string> {
// //     // First, generate an embedding for the query.
// //     const queryEmbedding = await getQueryEmbedding(query);
  
// //     // Call the Python microservice to search the FAISS index.
// //     const response = await fetch("http://localhost:5050/search", { //CHANGED FROM 5000 to 5050
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({ embedding: queryEmbedding, k: 3 })
// //     });

// //     console.log("📡 Retrieval service status:", response.status);
// //     console.log("📦 Request body length:", JSON.stringify({ embedding: queryEmbedding, k: 3 }).length);
// //     console.log("🔁 Headers:", response.headers);
  
// //     if (!response.ok) {
// //       throw new Error("Failed to retrieve context from the retrieval service.");
// //     }
  
// //     const data = await response.json();
// //     // data.documents is an array of relevant document strings.
// //     return data.documents.join("\n");
// //   } 




// // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// //   if (req.method !== "POST") {
// //     return res.status(405).json({ error: "Method not allowed" });
// //   }

// //   try {
// //     const { message } = req.body;
// //     let augmentedMessage = message;

// //     // Only retrieve context if the query is course-related.
// //     if (isCourseRelated(message)) {
// //         const retrievedContext = await retrieveContent(message);
// //         augmentedMessage = `Context:\n${retrievedContext}\n\nQuestion:\n${message}`;
// //       }

    
// //     // Append the new user message to the conversation history.
// //     conversationHistory.push({ role: "user", content: augmentedMessage });

// //     const response = await openai.chat.completions.create({
// //       model: "gpt-4o", 
// //       messages: conversationHistory,
// //     });

// //       const botReply = response.choices[0]?.message?.content || "I couldn't understand that.";

// //       // Append assistant's response to conversation history
// //       conversationHistory.push({ role: "assistant", content: botReply });

// //       res.status(200).json({ reply: botReply });
// //     } catch (error) {
// //       console.error("OpenAI API error:", error);
// //       res.status(500).json({ error: "Failed to fetch response from OpenAI" });
// //     }
// //   } 