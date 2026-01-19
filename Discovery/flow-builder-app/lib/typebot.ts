// Typebot API client utilities

import type { TypebotJSON } from './jsonValidation';

export interface CreateTypebotResponse {
    success: boolean;
    typebotId?: string;
    typebotUrl?: string;
    error?: string;
}

export interface TypebotAPIError {
    message: string;
    status: number;
}

/**
 * Get the Typebot editor URL for a given typebot ID
 */
export function getTypebotEditorUrl(typebotId: string, baseUrl: string): string {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/typebots/${typebotId}/edit`;
}

/**
 * Create a Typebot via the API - called directly from backend
 */
export async function createTypebotViaAPI(
    json: TypebotJSON,
    apiUrl: string,
    apiToken: string
): Promise<CreateTypebotResponse> {
    try {
        // Call Typebot API directly - it will handle all validation
        const response = await fetch(`${apiUrl}/api/v1/typebots`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Typebot API error (${response.status})`;

            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        const data = await response.json();

        // Extract typebot ID from response
        const typebotId = data.typebot?.id || data.id;

        if (!typebotId) {
            return {
                success: false,
                error: 'Typebot created but no ID returned',
            };
        }

        return {
            success: true,
            typebotId,
            typebotUrl: getTypebotEditorUrl(typebotId, apiUrl),
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error connecting to Typebot',
        };
    }
}
