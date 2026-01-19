import { NextRequest, NextResponse } from 'next/server';
import { callStraicoSonnet } from '@/lib/straico';
import type { StraicoChatRequest, StraicoChatResponse } from '@/lib/straico';

// Typebot Flow Builder System Prompt
const TYPEBOT_SYSTEM_PROMPT = `You are an AI Typebot Flow Builder assistant.

CRITICAL: When you see "Build now. Output only the strict JSON object...", respond with ONLY JSON.

BLOCK TYPE NAMES (use EXACTLY as shown):
- Text message: "text"
- Text input: "text input"
- Email input: "email input"
- Number input: "number input"
- Webhook/HTTP: "Webhook"

EXACT SCHEMA FORMAT:
{
  "workspaceId": "cm0yoasvt001fq8mubqsy1i2b",
  "typebot": {
    "name": "Bot Name",
    "groups": [
      {
        "id": "g1",
        "title": "Welcome",
        "graphCoordinates": {"x": 0, "y": 0},
        "blocks": [
          {
            "id": "b1",
            "type": "text",
            "content": {
              "richText": [{"type": "p", "children": [{"text": "Hello"}]}]
            },
            "outgoingEdgeId": "e1"
          }
        ]
      },
      {
        "id": "g2",
        "title": "Input",
        "graphCoordinates": {"x": 400, "y": 0},
        "blocks": [
          {
            "id": "b2",
            "type": "text input",
            "options": {
              "labels": {"placeholder": "Name..."},
              "variableId": "v1"
            }
          }
        ]
      }
    ],
    "edges": [
      {"id": "e1", "from": {"blockId": "b1"}, "to": {"groupId": "g2"}}
    ],
    "variables": [
      {"id": "v1", "name": "name"}
    ]
  }
}

CRITICAL RULES:
1. Use EXACT type names: "text", "text input", "email input", "number input", "Webhook"
2. graphCoordinates required (x increases by 400 per group)
3. NEVER create edges between blocks in the SAME group - blocks execute sequentially
4. ONLY create edges that go to a DIFFERENT group
5. Last block in each group should NOT have outgoingEdgeId

Follow these rules strictly.`;

export async function POST(request: NextRequest) {
  try {
    const body: StraicoChatRequest = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required',
        } as StraicoChatResponse,
        { status: 400 }
      );
    }

    const apiKey = process.env.STRAICO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Straico API key not configured',
        } as StraicoChatResponse,
        { status: 500 }
      );
    }

    // Call Straico
    const result = await callStraicoSonnet(apiKey, message, TYPEBOT_SYSTEM_PROMPT);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to get response',
        } as StraicoChatResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reply: result.reply || '',
    } as StraicoChatResponse);
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as StraicoChatResponse,
      { status: 500 }
    );
  }
}
