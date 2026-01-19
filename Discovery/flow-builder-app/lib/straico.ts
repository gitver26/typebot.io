// TypeScript types and utilities for Straico API

export interface StraicoMessage {
    role: 'user' | 'assistant' | 'system';
    content: string | Array<{ type: string; text?: string; image_url?: any }>;
}

export interface StraicoChatRequest {
    message: string;
    history?: StraicoMessage[];
}

export interface StraicoChatResponse {
    success: boolean;
    reply?: string;
    error?: string;
}

export interface StraicoAPIResponse {
    id?: string;
    model?: string;
    choices?: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason?: string;
    }>;
    error?: string;
}

/**
 * Call the Straico chat completions API with Claude 3.5 Sonnet
 */
export async function callStraicoSonnet(
    apiKey: string,
    userMessage: string,
    systemPrompt: string
): Promise<{ success: boolean; reply?: string; error?: string }> {
    try {
        const response = await fetch(
            `https://api.straico.com/v0/chat/completions`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'anthropic/claude-3.5-sonnet',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt,
                        },
                        {
                            role: 'user',
                            content: userMessage,
                        },
                    ],
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `Straico API error (${response.status}): ${errorText}`,
            };
        }

        const data: StraicoAPIResponse = await response.json();

        if (data.choices && data.choices.length > 0) {
            return {
                success: true,
                reply: data.choices[0].message.content,
            };
        }

        return {
            success: false,
            error: 'No response from Straico',
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
