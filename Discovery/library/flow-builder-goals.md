# Typebot Flow Builder Web App – Goals and Checklist

## 1. High‑Level Goal

- Build a Next.js web app where a user can:
  - Chat with a “Typebot Flow Builder” (Straico agent + RAG on Discovery docs).
  - Iterate on requirements for the Typebot they want.
  - Ask the agent to output a strict TypebotV6 JSON schema.
  - Use the user’s Typebot token + workspace ID to create/publish the Typebot via HTTP/API.
  - Cover common patterns: contact forms, webhooks, Gmail, Google Sheets, OpenAI, conditions, delays, ratings, redirects, etc.

---

## 2. Phase 1 – Foundations and Wiring

- Define environment variables for external services:
  - `STRAICO_API_KEY`, `STRAICO_AGENT_ID`, `STRAICO_RAG_ID`
  - `TYPEBOT_API_TOKEN`, `TYPEBOT_WORKSPACE_ID`
- Keep Straico infrastructure manageable with `Discovery/straico-manager.sh`:
  - Verify `list_agents`, `list_rags`, `connect_rag_to_agent` work.
  - Prefer `STRAICO_API_KEY` from environment instead of hardcoding.
- Decide the Next.js entry point:
  - Choose URL (for example `/flow-builder`).
  - Confirm app router vs pages router (app router is the likely choice).

---

## 3. Phase 2 – Chat UI + Straico Agent Integration

- Implement backend call to the Straico agent:
  - Create an API route or server action (for example `POST /api/straico/chat`).
  - Read `STRAICO_API_KEY` and `STRAICO_AGENT_ID` from environment variables.
  - Forward `{ agent_id, prompt, messages/history }` to Straico.
  - Return a simplified `{ reply, raw }` payload to the frontend with clear error mapping.
- Build a minimal chat front end:
  - Text area + “Send” button.
  - Display conversation history (user and agent messages).
  - Disable send while the request is in flight and show a loading state.
- Guardrails for the agent:
  - System prompt should ask 2–4 clarifying questions before building.
  - Agent must only output strict JSON when explicitly instructed (for example “Build now, output JSON only”).

---

## 4. Phase 3 – JSON Schema Generation and Validation

- Define the “build my Typebot” interaction:
  - Add a “Generate Flow JSON” button in the UI.
  - On click, send a message to the agent instructing it to output only JSON.
- Validate the returned schema before calling Typebot:
  - Parse the agent reply as JSON; reject or repair markdown or extra text.
  - Enforce top‑level shape: `{ "workspaceId": "<id>", "typebot": { ... } }`.
  - Optionally validate against a lightweight schema that mirrors `typebot-flow-agent.yaml`.
- Show the JSON to the user:
  - Pretty‑print JSON in a read‑only viewer.
  - Allow copy to clipboard and optional download as `.json`.

---

## 5. Phase 4 – Typebot Creation and Feedback Loop

- Implement Typebot `createTypebot` HTTP call:
  - Create an API route such as `POST /api/typebot/create`.
  - Read `TYPEBOT_API_TOKEN` and workspace ID from user input or environment.
  - POST the validated JSON to Typebot’s `POST /api/v1/typebots` (or equivalent).
  - Handle HTTP errors (invalid JSON, auth failures, quotas) with clear messages.
- Connect the “Publish” button:
  - On click, send validated JSON to `/api/typebot/create`.
  - On success, show the new Typebot ID and a link to open it in Typebot.
- Close the loop with the user and agent:
  - Display “Typebot created: <id>”.
  - Optionally ask the agent to suggest test prompts for this bot.

---

## 6. Phase 5 – Core Flow Patterns to Support

Each pattern should have:

- A concrete JSON/YAML example in `Discovery`.
- The same pattern indexed into the Straico RAG.
- At least one manual end‑to‑end test where:
  - The agent designs the flow.
  - Typebot accepts the JSON.

Patterns:

- Collecting user info:
  - Name, email, phone, address, company and similar.
  - Correct Input blocks and variables for each field.
- Sending email via Gmail:
  - Subject and body templates using variables.
  - Correct variable mapping into Gmail block inputs.
- Adding a row to Google Sheets:
  - Mapping variables (for example name, email, rating) into columns.
- Sending questions to OpenAI block and waiting for response:
  - Pass relevant context variables into the prompt.
  - Use the OpenAI reply as a bubble back to the user.
- Sending data via HTTP/webhook to Pabbly, Zapier or similar:
  - Configure URL, method, headers and JSON body from variables.
- Using conditional logic:
  - Age‑based routing (for example `age > 30` vs `age <= 30`).
  - Rating‑based routes or optional questions.
- Delays:
  - Wait N seconds block (for example 5 seconds) before continuing.
- Ratings and feedback:
  - Ask for rating.
  - Store rating in variables and forward via webhook, Sheets or OpenAI.

---

## 7. Phase 6 – UX and Production Hardening

- User authentication and separation:
  - Allow each user to store their own Typebot token and workspace ID.
- Rate limiting and abuse protection:
  - Protect chat and create endpoints from misuse.
- Logging and observability:
  - Log Straico calls, Typebot creation attempts and validation errors.
  - Never log secrets or full tokens.
- Error‑friendly UX:
  - Clear reasons when JSON validation or Typebot creation fails.
  - Offer a way to “ask the agent to fix this error” by sending the error back into the chat.
- Keeping RAG in sync with Discovery:
  - When Discovery YAML/MD changes, re‑upload updated files to RAG.
  - Consider simple scripts (or `straico-manager.sh`) as the single source for RAG updates.

