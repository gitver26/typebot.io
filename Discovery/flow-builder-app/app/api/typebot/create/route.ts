import { NextRequest, NextResponse } from 'next/server';
import { createTypebotViaAPI, type CreateTypebotResponse } from '@/lib/typebot';
import type { TypebotJSON } from '@/lib/jsonValidation';

export async function POST(request: NextRequest) {
    try {
        const json: TypebotJSON = await request.json();

        // Skip local validation - let Typebot API be the source of truth
        // Their API will validate and return detailed errors if needed

        // Get Typebot API credentials from environment
        const apiUrl = process.env.TYPEBOT_API_URL;
        const apiToken = process.env.TYPEBOT_API_TOKEN;

        if (!apiUrl || !apiToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Typebot API not configured. Add TYPEBOT_API_URL and TYPEBOT_API_TOKEN to .env.local',
                } as CreateTypebotResponse,
                { status: 500 }
            );
        }

        // Create the typebot
        const result = await createTypebotViaAPI(json, apiUrl, apiToken);

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in Typebot create route:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            } as CreateTypebotResponse,
            { status: 500 }
        );
    }
}
