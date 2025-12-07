import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const orgInfoPath = path.join(process.cwd(), 'org-info.txt');
const organizationInfo = fs.readFileSync(orgInfoPath, 'utf-8');

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemPrompt = `You are a knowledgeable and professional customer support assistant for TechCorp Inc. You have comprehensive knowledge about our company, services, pricing, and policies.

Here is our company information:
${organizationInfo}

Guidelines:
- Be helpful, professional, and friendly
- Answer questions about our services, pricing, and features based on the provided information
- If asked about something not in the company information, use your general knowledge but make it clear it's not official company policy
- For billing or account-specific questions, direct customers to contact support@techcorp.com
- Always promote our Enterprise plan for customers with complex needs
- Suggest relevant services based on customer needs`;

  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
