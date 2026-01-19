# Typebot Flow Building Agent Guide

## Purpose

- Document how Typebot flows are represented as JSON (TypebotV6 and friends).
- Enable IDE agents to design flows and create Typebots via the public API.
- Serve as a living reference as we discover more of the Typebot codebase.

This guide is intentionally written at the level of an **agent developer** who
can read TypeScript/Zod schemas and wants a clear mental model to generate
valid flows.

---

## 1. Core Data Model: TypebotV6

The canonical flow representation is `TypebotV6`, defined in
`packages/typebot/src/schemas/typebot.ts`.

Key fields:

- `version`: one of `typebotV6Versions` (always target the latest).
- `id`: unique bot id (assigned by the backend on create).
- `name`: human-readable bot name.
- `workspaceId`: owning workspace id.
- `groups: GroupV6[]`: list of groups; each group contains ordered blocks.
- `events: Event[]`:
  - For v6: first element is a START event; subsequent ones are draggable events.
- `edges: Edge[]`: directed connections in the flow graph.
- `variables`: variables used to store answers and intermediate data.
- `theme`, `settings`, `resultsTablePreferences`, `folderId`, `publicId`, etc.

The essential graph concepts are:

- **Groups**: columns on the canvas.
- **Blocks**: steps inside groups (messages, inputs, logic, integrations, AI blocks).
- **Events**: entry points such as START.
- **Edges**: arrows connecting events/blocks to target groups/blocks.

---

## 2. Groups and Blocks

### GroupV6

Defined in `packages/groups/src/schemas.ts`:

- `id: string`
- `title: string`
- `graphCoordinates: { x: number; y: number }`
- `blocks: BlockV6[]`

Interpretation:

- A group is a visual column.
- `graphCoordinates` define its position in the editor.
- `blocks` is the ordered list of blocks in that column.

### BlockV6

Defined in `packages/blocks/core/src/schemas/schema.ts` as a union:

- `StartBlock`
- `BubbleBlock`
- `InputBlockV6`
- `LogicBlockV6`
- `IntegrationBlockV6`
- `ForgedBlock`

All blocks share:

- `id: string`
- `outgoingEdgeId?: string` (id of the edge leaving this block).

Agent mindset:

- Choose the right block family (bubble, input, logic, integration, forged).
- Provide the correct `type` literal and `options` according to that family’s schema.

---

## 3. Edges and Events

Edges are defined in `packages/typebot/src/schemas/edge.ts`:

- `Edge`:
  - `id: string`
  - `from`: either
    - `BlockSource`:
      - `blockId: string`
      - `itemId?: string` (for item-based branching, e.g. buttons, cards)
      - `pathId?: string` (for path-based branching, e.g. cards paths, A/B test)
    - `EventSource`:
      - `eventId: string`
  - `to`:
    - `groupId: string`
    - `blockId?: string`

Practical rules:

- **Linear transition**:
  - Edge `from.blockId = currentBlock.id`.
  - Edge `to.groupId = nextGroup.id`, `to.blockId = first block` (recommended).
  - Set `currentBlock.outgoingEdgeId = edge.id`.
- **Branching from items/paths**:
  - Use `itemId` and/or `pathId` in `from` to distinguish branches.

Events (`START` and others) live in `@typebot.io/events/schemas` and are pulled
into `TypebotV6.events`. They are the entry points of a Typebot.

### 3.1 Event Types and Entry Points

Event schemas are defined in `packages/events/src/schemas.ts`, with
`EventType` in `packages/events/src/constants.ts`:

- `start`
- `command`
- `reply`
- `invalidReply`

Common event fields:

- `id: string`
- `type: EventType`
- `graphCoordinates: { x: number; y: number }`
- `outgoingEdgeId?: string` (edge leaving this event, typically to the first group)

Specific events:

- `start`:
  - Default entry point when a user opens the bot.
  - Usually has one `outgoingEdgeId` to the first group (welcome bubble, first input, etc.).
- `command`:
  - Triggered when an external command is sent, e.g. via a `continueChat` HTTP
    request with `message.type = "command"` or `Typebot.sendCommand(...)` in
    embeds.
  - `options` may include:
    - `command?: string` (name of the command).
    - `resumeAfter?: boolean` (whether to resume after executing the command
      flow; legacy, best replaced with Return blocks).
  - By default, when a command event finishes its flow, the session ends unless
    a Return block is used to go back to the main flow.
- `reply` and `invalidReply`:
  - Used for reacting to replies outside the main flow; they share options:
    - `contentVariableId?: string`
    - `inputNameVariableId?: string`
    - `inputTypeVariableId?: string`

When creating a typebot:

- If you **omit `events`**, the backend creates a `start` event automatically at
  coordinates `{ x: 0, y: 0 }` and wires it to the main group.
- In more advanced flows, you can explicitly define:
  - A `start` event and its outgoing edge.
  - Additional `command`/`reply`/`invalidReply` events as alternative entry
    points with their own outgoing edges.

---

## 4. Input Blocks Overview

Input blocks are defined under `packages/blocks/inputs/src`. The union and types
are in `schema.ts` and the type enum is in `constants.ts`.

`InputBlockType` includes (non-exhaustive):

- `"text input"`
- `"number input"`
- `"email input"`
- `"url input"`
- `"date input"`
- `"time input"`
- `"phone number input"`
- `"choice input"`
- `"picture choice input"`
- `"payment input"`
- `"rating input"`
- `"file input"`
- `"cards"`

Patterns:

- Every input block:
  - Extends `blockBaseSchema` (id + outgoingEdgeId).
  - Sets `type` to a literal or enum variant from `InputBlockType`.
  - Defines `options` by extending `optionBaseSchema` plus block-specific fields.
- Some blocks support both v5 and v6 variants; v6 is what new flows should use.

Examples:

- Text input:
  - Schema: `textInputSchema` in `text/schema.ts`.
  - Options:
    - `labels.placeholder`, `labels.button`
    - `isLong`, `inputMode`, `audioClip`, `attachments`.
- Choice (buttons):
  - Schema: `buttonsInputSchemas` in `choice/schema.ts`.
  - Items: button list with `content`, `value`, `displayCondition`.
- Cards:
  - Schema: `cardsBlockSchema` in `cards/schema.ts`.
  - Items: rich cards with image, title, description and paths for branching.

---

## 5. Cards Input Block (Deep Dive)

The cards block is defined in `packages/blocks/inputs/src/cards/schema.ts`.

### Options

`cardsOptionsSchema` extends `optionBaseSchema` with:

- `saveResponseMapping?: { field; variableId }[]`
  - `field` is an enum of `cardMappableFields` from `cards/constants.ts`:
    - `"Image URL"`, `"Title"`, `"Description"`, `"Button"`, `"Internal Value"`.
  - `variableId` is the id of the variable that will store that field’s value.

Usage pattern:

- Map `"Internal Value"` to a variable for a stable semantic value.
- Optionally map `"Title"` or other fields to separate variables if needed.

### Items and Paths

`cardsItemSchema` extends `itemBaseSchemas.v6` with:

- `imageUrl?: string | null`
- `title?: string | null`
- `description?: string | null`
- `options?:`
  - `displayCondition?: { isEnabled?: boolean; condition?: Condition }`
  - `internalValue?: string | null`
- `paths?: CardsItemPath[]`

`CardsItemPath` (`cardsItemPathSchema`) has:

- `id: string`
- `text?: string`
- `outgoingEdgeId?: string`

Branching:

- For each path, create a distinct `Edge` with:
  - `from.blockId = cardsBlock.id`
  - `from.itemId = cardItem.id`
  - `from.pathId = path.id`
  - `to.groupId` (and optional `to.blockId`) pointing to the next group/block.
- Set `path.outgoingEdgeId = edge.id`.

This provides rich, multi-path branching from a single cards block.

---

## 6. Creating a Typebot via API

The public create endpoint is wired in
`apps/builder/src/features/typebot/api/router.ts`:

- Method: `POST`
- Path: `/v1/typebots`
- Input: `createTypebotInputSchema`
- Output: `{ typebot: TypebotV6 }`

The handler implementation is in
`apps/builder/src/features/typebot/api/handleCreateTypebot.ts`.

### Input Shape

`createTypebotInputSchema` is:

- `workspaceId: string`
- `typebot: Partial<Pick<TypebotV6, ...>>`

Where the pick includes:

- `name`, `icon`, `selectedThemeTemplateId`
- `groups`, `events`, `theme`, `settings`
- `folderId`, `variables`, `edges`
- `resultsTablePreferences`, `publicId`, `customDomain`

Backend behavior:

- Sets `version` to `latestTypebotVersion`.
- Creates a START event if `events` is omitted.
- Uses an empty array if `edges` is omitted.
- Sanitizes `groups`, `variables`, `settings` based on workspace and plan.

### Minimal Request Example

```json
{
  "workspaceId": "workspace_123",
  "typebot": {
    "name": "My AI generated bot",
    "groups": [],
    "edges": []
  }
}
```

This creates an empty bot. A real agent-generated bot should also define:

- At least one group with blocks.
- Edges connecting the START event and blocks.
- Any necessary variables.

---

## 7. External Next.js / Vercel App Pattern

An external app that creates Typebots typically:

1. Accepts a user specification (natural language or structured).
2. Uses an LLM agent to:
   - Plan groups, blocks, edges, and variables.
   - Emit a TypebotV6-shaped object matching `createTypebotInputSchema`.
3. Sends a request to the Typebot instance:
   - `POST {TYPEBOT_API_URL}/api/v1/typebots`
   - Authenticated via Bearer token or session.
4. Returns the new `typebot.id` and link to open it in the builder.

This guide plus the YAML spec are the reference materials the agent relies on
to stay within the valid Typebot schema and API contract.

## 8. Bubble Blocks (Messages)

Bubble blocks are the non-interactive messages the user sees (text, image,
video, embeds, audio). They are defined in
`packages/blocks/bubbles/src/schema.ts` as `bubbleBlockSchema`.

Key points:

- `BubbleBlock` extends `blockBaseSchema`:
  - `id: string`
  - `outgoingEdgeId?: string`
- It is a discriminated union on `type` (`BubbleBlockType`), including:
  - `"text"`: `textBubbleBlockSchema` with `content.html`, `content.richText`,
    `content.plainText`.
  - `"image"`: `imageBubbleBlockSchema` with an image URL and alt text.
  - `"video"`: `videoBubbleBlockSchema` with a video URL and autoplay/controls.
  - `"embed"`: `embedBubbleBlockSchema` with `content.url`, optional `height`
    and optional `waitForEvent`.
  - `"audio"`: `audioBubbleBlockSchema` with audio source and controls.

Agent mindset:

- Use bubble blocks to present information or media before/after input or logic.
- They do not save values to variables directly (no `options.variableId`).
- They participate in the graph only via `outgoingEdgeId` like any other block.

Typical flow:

- START event → BubbleBlock (text, image, embed, etc.) → InputBlock or LogicBlock.

## 9. Logic Blocks

Logic blocks handle branching, variable manipulation, and flow control. They are
defined in `packages/blocks/logic/src/schema.ts` as `logicBlockV5Schema` and
`logicBlockV6Schema`, both discriminated unions on `type` from `LogicBlockType`.

Included blocks:

- Flow control:
  - `REDIRECT` (`redirectBlockSchema`): jump to a URL (often ends the flow).
  - `JUMP` (`jumpBlockSchema`): jump to another group/block inside the bot.
  - `RETURN` (`returnBlockSchema`): return from a linked Typebot.
  - `TYPEBOT_LINK` (`typebotLinkBlockSchema`): enter another Typebot, with
    optional result merging.
  - `WAIT` (`waitBlockSchema`): pause the execution (delay).
- Variables and computation:
  - `SET_VARIABLE` (`setVariableBlockSchema`): update variables using built-in
    value types (Now, Pop, Shift, Map item with same index, etc.) or custom
    expressions.
  - `SCRIPT` (`scriptBlockSchema`): execute custom code or expressions, with
    options like `isExecutedOnClient`, `isUnsafe`, and
    `shouldExecuteInParentContext`.
- Branching:
  - `CONDITION` (`conditionBlockSchemas.v5/v6`): multi-branch block where each
    branch has a condition and an associated path/edge.
  - `A/B TEST` (`abTestBlockSchemas.v5/v6`): split traffic across multiple
    paths, each with a weight and outgoing edge.
- Webhooks:
  - `WEBHOOK` (`webhookBlockSchema`, v6-only): logic-level webhook call that
    maps response fields into variables when the HTTP request is configured
    elsewhere.

Patterns:

- All logic blocks extend `blockBaseSchema` and set `type` to a literal from
  `LogicBlockType`.
- `options` differ by block but often include:
  - `variableId` or other variable ids to persist results.
  - Booleans like `isExecutedOnClient`, `isUnsafe`.
  - Block-specific configuration (conditions, paths, target group/block, etc.).

Branching semantics:

- Condition and A/B test blocks have multiple internal paths.
- For each path, create an `Edge` where:
  - `from.blockId = logicBlock.id`
  - `from.pathId = path.id`
  - `to.groupId` (and optional `to.blockId`) points to the branch target.
- Set each path’s `outgoingEdgeId = edge.id` for graph consistency.

Agent mindset:

- Use logic blocks to:
  - Route the user based on conditions or experimentation (A/B test).
  - Manipulate variables (set, map, evaluate expressions).
  - Jump between groups or linked Typebots.

### 9.1 Set Variable

Set Variable blocks are defined in
`packages/blocks/logic/src/setVariable/schema.ts` as `setVariableBlockSchema`.
They update variables using a discriminated union of `options.type`.

Common fields:

- `options.variableId`: the id of the variable to modify.
- `options.isExecutedOnClient?`: whether to run the computation client-side.
- `options.isUnsafe?`: controls execution in preview/imported bots.

Operation types:

- Basic value types (no extra fields) such as:
  - `"Empty"`, `"Environment name"`, `"Device type"`, `"Transcript"`,
    `"User ID"`, `"Result ID"`, `"Random ID"`, `"Phone number"`,
    `"Contact name"`, `"Referral Click ID"`, `"Referral Source ID"`,
    `"Today"`, `"Moment of the day"`.
- Date operations:
  - `"Now"`, `"Yesterday"`, `"Tomorrow"` with optional `timeZone`.
- Custom expression:
  - `"Custom"` plus:
    - `expressionToEvaluate`, `isCode`, `expressionDescription`,
      `saveErrorInVariableId`.
- List mapping:
  - `"Map item with same index"` with `mapListItemParams`:
    - `baseItemVariableId`, `baseListVariableId`, `targetListVariableId`.
- List append:
  - `"Append value(s)"` with `item` string.
- Pop/shift:
  - `"Pop"` / `"Shift"` with `saveItemInVariableId` to store the removed item.

Agent mindset:

- Always set `options.variableId` to the target variable.
- Choose `type` based on the operation needed:
  - Dates and environment for contextual data.
  - List operations for arrays of items.
  - Custom expression for advanced logic.

### 9.2 Wait

The wait block is defined in `packages/blocks/logic/src/wait/schema.ts` as
`waitBlockSchema`.

- `options.secondsToWaitFor?: string`: how long to wait before continuing.
- `options.shouldPause?: boolean`: whether this represents a pause.

Use this to slow down or pause the conversation before the next block.

### 9.3 Redirect and Jump

Redirect (`redirectBlockSchema`):

- Defined in `packages/blocks/logic/src/redirect/schema.ts`.
- `options.url?: string`: destination URL.
- `options.isNewTab?: boolean`: whether to open in a new tab.

Use redirect to send the user to another page and typically end the flow.

Jump (`jumpBlockSchema`):

- Defined in `packages/blocks/logic/src/jump/schema.ts`.
- `options.groupId?: string`
- `options.blockId?: string`

Use jump to move execution to another group or specific block within the same
Typebot.

### 9.4 Script (Code)

The script block is defined in
`packages/blocks/logic/src/script/schema.ts` as `scriptBlockSchema`.

Options:

- `name?: string`
- `content?: string`: code or expression to evaluate.
- `isExecutedOnClient?: boolean`
- `isUnsafe?: boolean`
- `shouldExecuteInParentContext?: boolean`

Use this when other logic blocks are not expressive enough. Be careful with
client execution and unsafe flags.

### 9.5 Typebot Link and Return

Typebot Link (`typebotLinkBlockSchema`):

- Defined in
  `packages/blocks/logic/src/typebotLink/schema.ts`.
- `options.typebotId?: string`: target Typebot id.
- `options.groupId?: string`: optional target group in the linked bot.
- `options.mergeResults?: boolean`: merge results from the linked bot into the
  caller.

Return (`returnBlockSchema`):

- Defined in `packages/blocks/logic/src/return/schema.ts`.
- Has no options; returning ends the linked Typebot and goes back to the
  caller.

Agent mindset:

- Use Typebot Link to call reusable flows.
- Use Return in the linked bot to explicitly return control.

### 9.6 Condition and A/B Test

Condition blocks are defined in
`packages/blocks/logic/src/condition/schema.ts` as `conditionBlockSchemas`.

- Each `items[]` entry:
  - Has `id` and optional `content` (a Condition object).
  - Carries an `outgoingEdgeId` used to wire the branch.
- Edges:
  - `from.blockId = conditionBlock.id`
  - `from.itemId = item.id`

A/B Test blocks are defined in
`packages/blocks/logic/src/abTest/schema.ts` as `abTestBlockSchemas`.

- Items:
  - Two items with `path: "a"` and `path: "b"`.
- Options:
  - `options.aPercent?: number` (remaining traffic goes to path "b").

Agent mindset:

- Use Condition for deterministic branching based on conditions.
- Use A/B Test for randomized experiments between two paths.

### 9.7 Logic Webhook

The logic-level webhook block is defined in
`packages/blocks/logic/src/webhook/schema.ts` as `webhookBlockSchema`.

Options:

- `responseVariableMapping?: { id; variableId?; bodyPath? }[]`

Use this to pause the flow and wait for an external webhook callback before
continuing. It does not send HTTP requests itself: it listens for an incoming
POST to the block’s webhook URL and then maps response fields into variables
using `responseVariableMapping`. Combine it with an integration “Webhook”/HTTP
Request block or an external service that actually sends the HTTP request.

## 10. Integration Blocks

Integration blocks connect the flow to external systems (HTTP APIs, sheets,
analytics, email, etc.). They are defined in
`packages/blocks/integrations/src/schema.ts` as `integrationBlockV5Schema` and
`integrationBlockV6Schema`, both discriminated unions on `type` from
`IntegrationBlockType`.

Core pattern:

- All integration blocks extend `blockBaseSchema` and set `type` to a literal in
  `IntegrationBlockType`:
  - HTTP request (`HTTP_REQUEST`)
  - Google Sheets
  - Make.com
  - Zapier
  - Pabbly Connect
  - OpenAI
  - Chatwoot
  - Google Analytics
  - Pixel
  - Send email
- Many of these reuse a generic HTTP schema:
  - `httpRequestSchemas` and `httpRequestOptionsSchemas` in
    `packages/blocks/integrations/src/httpRequest/schema.ts`.

HTTP request block (`httpBlockSchemas`):

- `type: "HTTP_REQUEST"` (legacy name, still used).
- `options` (v5/v6) include:
  - `webhook`: HTTP request definition (`url`, `method`, `headers`,
    `queryParams`, `body`).
  - `variablesForTest`: sample variable values for testing.
  - `responseVariableMapping`: list of mappings with:
    - `variableId`
    - `bodyPath` (JSON path inside the response body).
  - `isCustomBody`, `isExecutedOnClient`, `timeout`, `proxyCredentialsId`.

Derived blocks (Zapier, Make.com, Pabbly, Google Sheets integrations):

- Compose their schemas by merging the HTTP block schemas:
  - v5: `httpBlockSchemas.v5.merge({ type: "<INTEGRATION_TYPE>" })`
  - v6: `httpBlockSchemas.v6.merge({ type: "<INTEGRATION_TYPE>" })`
- They share the same HTTP options and response mapping behavior; only the
  `type` changes so the editor can render the correct integration UI.

Other integrations (OpenAI, Chatwoot, Google Analytics, Pixel, Send email):

- Use their own schemas merged into `integrationBlockV5Schema` and
  `integrationBlockV6Schema`.
- They typically expose:
  - Provider-specific configuration (e.g. model, prompt, tracking ID).
  - Variable mapping options to save outputs into variables.

Agent mindset:

- Use integration blocks whenever you need external data or side effects:
  - Fetch or send data via HTTP.
  - Trigger automation platforms (Zapier, Make.com, Pabbly).
  - Append/read rows from Google Sheets.
  - Call OpenAI.
  - Track analytics or trigger emails.
- Always map important response fields into variables using the available
  mapping options; later blocks should read from those variables, not from raw
  response bodies.

## 11. File Input Block (Deep Dive)

The file input block lets users upload one or more files. It is defined in
`packages/blocks/inputs/src/file/schema.ts` and uses `InputBlockType.FILE` as
its `type`.

Schemas:

- `fileInputOptionsV5Schema`:
  - Extends `optionBaseSchema` and adds:
    - `isRequired?: boolean`
    - `isMultipleAllowed?: boolean`
    - `labels?` with:
      - `placeholder?`, `button?`, `clear?`, `skip?`
      - `success?` with `single?` and `multiple?`
    - `allowedFileTypes?`:
      - `isEnabled?: boolean`
      - `types?: string[]` (extensions or MIME types)
    - `sizeLimit?: number` (max size in bytes, v5 only)
    - `visibility?: "Auto" | "Public" | "Private"`
- `fileInputOptionsSchemas.v6`:
  - Same as v5 but omits `sizeLimit` (size is handled elsewhere).

Block shapes:

- `fileInputBlockSchemas.v5`:
  - `blockBaseSchema` + `type: "file input"` + `options?: fileInputOptionsV5`.
- `fileInputBlockSchemas.v6`:
  - Same but with `options?: fileInputOptionsV6` (no `sizeLimit`).
- `FileInputBlock` is the union of v5 and v6; `FileInputBlockV6` is the v6-only
  shape.

Default options:

- Defined in `packages/blocks/inputs/src/file/constants.ts` as
  `defaultFileInputOptions` (satisfies `FileInputBlock["options"]`):
  - `isRequired: true`
  - `isMultipleAllowed: false`
  - `visibility: "Auto"`
  - `labels`:
    - `placeholder`: rich HTML string with “Click to upload or drag and drop
      (size limit: 10MB)”
    - `button: "Upload"`
    - `clear: "Clear"`
    - `skip: "Skip"`
    - `success.single: "File uploaded"`
    - `success.multiple: "{total} files uploaded"`

Agent mindset:

- Use the file input block when the flow requires documents, images, or other
  files from the user.
- Choose:
  - `isRequired` vs optional upload.
  - `isMultipleAllowed` depending on whether you expect one or many files.
  - `visibility` based on whether files should be public, private, or
    auto-managed by Typebot.
- Adjust labels to match the conversation tone, but keep semantics consistent:
  the block mainly controls upload UX and where the files are stored; later
  blocks (logic or integrations) will typically read from variables that hold
  file URLs or ids.

---

## 12. Flow Builder System Prompt

This section stores a reference **system prompt** for an AI agent that designs
Typebot flows and emits valid JSON for `POST /api/v1/typebots`.

### 12.1 Output Contract (Strict JSON Only)

- The agent must respond with a single JSON object and no extra text.
- JSON must be:
  - Strict: double-quoted keys/strings, no comments, no trailing commas.
  - Direct: no markdown fences around the final answer.
- Top-level shape:

```json
{
  "workspaceId": "workspace_123",
  "typebot": {
    "name": "My generated bot",
    "groups": [],
    "edges": [],
    "variables": []
  }
}
```

Rules:

- `workspaceId` is a string supplied by the caller (or placeholder).
- `typebot` follows the `createTypebotInputSchema` rules:
  - Agent may include: `name`, `icon`, `selectedThemeTemplateId`, `groups`,
    `events`, `theme`, `settings`, `folderId`, `variables`, `edges`,
    `resultsTablePreferences`, `publicId`, `customDomain`.
  - Agent does not set `version` or `id`.
  - If `events` is omitted, the server creates a START event.

### 12.2 Core Structure the Agent Must Respect

- Groups:
  - Columns on the canvas.
  - Example:

    ```json
    {
      "id": "group_main",
      "title": "Main",
      "graphCoordinates": { "x": 0, "y": 0 },
      "blocks": []
    }
    ```

- Blocks:
  - Basic shape:

    ```json
    {
      "id": "block_id",
      "type": "text",
      "outgoingEdgeId": "edge_id_optional"
    }
    ```

  - Families:
    - Bubble: non-interactive messages.
    - Input: user answers (text, file, cards, etc.).
    - Logic: branching, variables, jumps.
    - Integration: HTTP/APIs, OpenAI, Sheets, etc.

- Edges:
  - Connect events/blocks to target groups/blocks:

    ```json
    {
      "id": "edge_id",
      "from": { "blockId": "source_block_id" },
      "to": { "groupId": "target_group_id", "blockId": "optional_first_block_id" }
    }
    ```

  - `from.itemId` and `from.pathId` are used for branching from blocks with
    `items`/paths (conditions, A/B tests, cards, choice inputs).

- Variables:
  - Store answers and integration outputs.
  - Example:

    ```json
    {
      "id": "var_email",
      "name": "Email",
      "type": "Email"
    }
    ```

### 12.3 JSON Patterns (Reference Examples)

The agent should reuse and adapt these patterns.

#### 12.3.1 Minimal Flow Pattern

```json
{
  "workspaceId": "workspace_123",
  "typebot": {
    "name": "Lead capture with branching",
    "groups": [
      {
        "id": "group_welcome",
        "title": "Welcome",
        "graphCoordinates": { "x": 0, "y": 0 },
        "blocks": [
          {
            "id": "block_welcome_bubble",
            "type": "text",
            "content": {
              "plainText": "Hi! I will ask a few questions."
            },
            "outgoingEdgeId": "edge_welcome_to_input"
          },
          {
            "id": "block_name_input",
            "type": "text input",
            "options": {
              "variableId": "var_name",
              "labels": {
                "placeholder": "Type your name",
                "button": "Next"
              }
            },
            "outgoingEdgeId": "edge_input_to_logic"
          }
        ]
      },
      {
        "id": "group_logic",
        "title": "Logic",
        "graphCoordinates": { "x": 400, "y": 0 },
        "blocks": []
      }
    ],
    "edges": [
      {
        "id": "edge_welcome_to_input",
        "from": { "blockId": "block_welcome_bubble" },
        "to": { "groupId": "group_welcome", "blockId": "block_name_input" }
      },
      {
        "id": "edge_input_to_logic",
        "from": { "blockId": "block_name_input" },
        "to": { "groupId": "group_logic" }
      }
    ],
    "variables": [
      {
        "id": "var_name",
        "name": "Name",
        "type": "Short text"
      }
    ]
  }
}
```

Strictness and wiring constraints:

- All ids (`group.id`, `block.id`, `edge.id`, `variable.id`) are unique.
- Every `outgoingEdgeId` on a block matches an `Edge.id`.
- Every `Edge.from.blockId` refers to an existing block id.
- Every `Edge.to.groupId` refers to an existing group id.

#### 12.3.2 Simple Logic Branch (Condition + Edges)

```json
{
  "groups": [
    {
      "id": "group_logic",
      "title": "Segment users",
      "graphCoordinates": { "x": 200, "y": 0 },
      "blocks": [
        {
          "id": "block_condition_segment",
          "type": "Condition",
          "items": [
            {
              "id": "condition_item_high_value",
              "outgoingEdgeId": "edge_condition_to_vip"
            },
            {
              "id": "condition_item_regular",
              "outgoingEdgeId": "edge_condition_to_regular"
            }
          ]
        }
      ]
    },
    {
      "id": "group_vip",
      "title": "VIP path",
      "graphCoordinates": { "x": 600, "y": -100 },
      "blocks": []
    },
    {
      "id": "group_regular",
      "title": "Regular path",
      "graphCoordinates": { "x": 600, "y": 100 },
      "blocks": []
    }
  ],
  "edges": [
    {
      "id": "edge_condition_to_vip",
      "from": {
        "blockId": "block_condition_segment",
        "itemId": "condition_item_high_value"
      },
      "to": { "groupId": "group_vip" }
    },
    {
      "id": "edge_condition_to_regular",
      "from": {
        "blockId": "block_condition_segment",
        "itemId": "condition_item_regular"
      },
      "to": { "groupId": "group_regular" }
    }
  ]
}
```

Each condition item represents a branch; edges use `itemId` to select a branch.

#### 12.3.3 HTTP Integration with Response Mapping

```json
{
  "groups": [
    {
      "id": "group_integration",
      "title": "Fetch profile",
      "graphCoordinates": { "x": 400, "y": 0 },
      "blocks": [
        {
          "id": "block_http_profile",
          "type": "Webhook",
          "options": {
            "webhook": {
              "url": "https://api.example.com/profile",
              "method": "GET",
              "headers": [
                {
                  "id": "hdr_auth",
                  "key": "Authorization",
                  "value": "Bearer {{var_api_token}}"
                }
              ],
              "queryParams": [
                {
                  "id": "qp_email",
                  "key": "email",
                  "value": "{{var_email}}"
                }
              ]
            },
            "responseVariableMapping": [
              {
                "id": "map_full_name",
                "variableId": "var_full_name",
                "bodyPath": "$.name"
              },
              {
                "id": "map_plan",
                "variableId": "var_plan",
                "bodyPath": "$.plan"
              }
            ]
          },
          "outgoingEdgeId": "edge_http_to_next"
        }
      ]
    },
    {
      "id": "group_after_http",
      "title": "After HTTP",
      "graphCoordinates": { "x": 800, "y": 0 },
      "blocks": []
    }
  ],
  "edges": [
    {
      "id": "edge_http_to_next",
      "from": { "blockId": "block_http_profile" },
      "to": { "groupId": "group_after_http" }
    }
  ],
  "variables": [
    {
      "id": "var_api_token",
      "name": "API token",
      "type": "Secret"
    },
    {
      "id": "var_email",
      "name": "Email",
      "type": "Email"
    },
    {
      "id": "var_full_name",
      "name": "Full name",
      "type": "Short text"
    },
    {
      "id": "var_plan",
      "name": "Plan",
      "type": "Short text"
    }
  ]
}
```

Key lesson: use `responseVariableMapping` to map JSON body fields into variables.

#### 12.3.4 File Input Followed by Integration

```json
{
  "groups": [
    {
      "id": "group_upload",
      "title": "Upload document",
      "graphCoordinates": { "x": 0, "y": 0 },
      "blocks": [
        {
          "id": "block_file_upload",
          "type": "file input",
          "options": {
            "variableId": "var_uploaded_files",
            "isRequired": true,
            "isMultipleAllowed": false,
            "visibility": "Auto",
            "labels": {
              "button": "Upload your file"
            }
          },
          "outgoingEdgeId": "edge_file_to_integration"
        }
      ]
    },
    {
      "id": "group_process_file",
      "title": "Process file",
      "graphCoordinates": { "x": 400, "y": 0 },
      "blocks": [
        {
          "id": "block_http_process_file",
          "type": "Webhook",
          "options": {
            "webhook": {
              "url": "https://api.example.com/process-file",
              "method": "POST",
              "headers": [
                {
                  "id": "hdr_content_type",
                  "key": "Content-Type",
                  "value": "application/json"
                }
              ],
              "body": "{ \"fileVariableId\": \"{{var_uploaded_files}}\" }"
            }
          },
          "outgoingEdgeId": "edge_integration_to_next"
        }
      ]
    }
  ],
  "edges": [
    {
      "id": "edge_file_to_integration",
      "from": { "blockId": "block_file_upload" },
      "to": { "groupId": "group_process_file" }
    },
    {
      "id": "edge_integration_to_next",
      "from": { "blockId": "block_http_process_file" },
      "to": { "groupId": "group_next" }
    }
  ],
  "variables": [
    {
      "id": "var_uploaded_files",
      "name": "Uploaded files",
      "type": "List"
    }
  ]
}
```

This pattern is the reference for “upload file then process it via integration”.

#### 12.3.5 Set Variable Map Item with Same Index

```json
{
  "groups": [
    {
      "id": "group_map_ids",
      "title": "Map label to ID",
      "graphCoordinates": { "x": 200, "y": 0 },
      "blocks": [
        {
          "id": "block_set_id_from_label",
          "type": "Set variable",
          "options": {
            "variableId": "var_selected_id",
            "type": "Map item with same index",
            "mapListItemParams": {
              "baseItemVariableId": "var_selected_label",
              "baseListVariableId": "var_labels",
              "targetListVariableId": "var_ids"
            }
          },
          "outgoingEdgeId": "edge_map_to_next"
        }
      ]
    },
    {
      "id": "group_after_mapping",
      "title": "After mapping",
      "graphCoordinates": { "x": 600, "y": 0 },
      "blocks": []
    }
  ],
  "edges": [
    {
      "id": "edge_map_to_next",
      "from": { "blockId": "block_set_id_from_label" },
      "to": { "groupId": "group_after_mapping" }
    }
  ],
  "variables": [
    {
      "id": "var_labels",
      "name": "Labels",
      "type": "List"
    },
    {
      "id": "var_ids",
      "name": "Ids",
      "type": "List"
    },
    {
      "id": "var_selected_label",
      "name": "Selected label",
      "type": "Short text"
    },
    {
      "id": "var_selected_id",
      "name": "Selected id",
      "type": "Short text"
    }
  ]
}
```

#### 12.3.6 Set Variable Custom Expression (Score Calculation)

```json
{
  "groups": [
    {
      "id": "group_score_logic",
      "title": "Compute score",
      "graphCoordinates": { "x": 200, "y": 0 },
      "blocks": [
        {
          "id": "block_set_score",
          "type": "Set variable",
          "options": {
            "variableId": "var_score",
            "type": "Custom",
            "expressionToEvaluate": "{{base_score}} + {{bonus}}",
            "isCode": false,
            "expressionDescription": "Add base score and bonus"
          },
          "outgoingEdgeId": "edge_score_to_next"
        }
      ]
    },
    {
      "id": "group_after_score",
      "title": "After score",
      "graphCoordinates": { "x": 600, "y": 0 },
      "blocks": []
    }
  ],
  "edges": [
    {
      "id": "edge_score_to_next",
      "from": { "blockId": "block_set_score" },
      "to": { "groupId": "group_after_score" }
    }
  ],
  "variables": [
    {
      "id": "var_score",
      "name": "Score",
      "type": "Number"
    },
    {
      "id": "var_base_score",
      "name": "base_score",
      "type": "Number"
    },
    {
      "id": "var_bonus",
      "name": "bonus",
      "type": "Number"
    }
  ]
}
```

---

## 13. Results, Variable Persistence, and Result ID

This section explains how variables end up in the Results table, what a Result
row looks like, and how `resultId` behaves across the system.

### 13.1 Variables and “Save in results”

Variable schemas live in `packages/variables/src/schemas.ts` and the user docs in
`apps/docs/editor/variables.mdx` and
`apps/docs/editor/blocks/logic/set-variable.mdx`.

Shape:

- `id: string`
- `name: string`
- `isSessionVariable?: boolean`
- `value?: string | string[] | null`

Semantics:

- By default, variables are **not** saved in the Results table:
  - In the builder UI, this corresponds to `Save in results = off`.
  - Implementation: `isSessionVariable` is `true` when the variable is
    session-only.
- When `Save in results` is enabled:
  - `isSessionVariable` becomes `false` (or undefined) and the variable is
    eligible to be persisted.
  - On each upsert, the engine gathers all variables with a defined value and
    `!isSessionVariable`.
- Content rules:
  - Variables are stored as text or list of texts.
  - Numbers, booleans or objects are stringified before persistence.

Agent mindset:

- For data that should appear as a column in Results:
  - Make sure there is a variable defined for it.
  - Use input blocks or Set Variable blocks to populate its value.
  - Conceptually enable “Save in results” (non-session variable) so it is
    persisted.
- For temporary or sensitive data:
  - Keep `isSessionVariable` true so it never hits the Results table.

### 13.2 Result Rows and the Results Table

Result schemas live in `packages/results/src/schemas/results.ts`.

`Result` (stored in the database):

- `id: string`
- `createdAt: Date`
- `typebotId: string`
- `variables: VariableWithValue[]` (non-session variables with values)
- `isCompleted: boolean`
- `hasStarted: boolean | null`
- `isArchived: boolean | null`
- `lastChatSessionId: string | null`

There are also related tables linked by `resultId`:

- `Answer` / `AnswerV2`: per-block answers.
- `VisitedEdge`: edges traversed during the run.
- `SetVariableHistoryItem`: variable changes applied by Set Variable blocks.
- `Log`: logs with status and details.

The Results table displayed in the builder is built from:

- `parseResultHeader` in `packages/results/src/parseResultHeader.ts`:
  - Creates a `ResultHeaderCell[]` that includes:
    - A `"Submitted at"` column (date).
    - Columns for input blocks, usually keyed by the block’s `options.variableId`
      or the group title.
    - Columns for non-session variables not already covered by inputs.
- `convertResultsToTableData` in
  `packages/results/src/convertResultsToTableData.ts`:
  - Takes `ResultWithAnswers[]` and the header cells and builds table rows:
    - `id.plainText` is the `Result.id`.
    - Other cells are filled from answers and variables, mapped by header id.

Result table preferences:

- Stored in `typebot.resultsTablePreferences`:
  - `columnsOrder?: string[]`
  - `columnsVisibility?: Record<string, boolean>`
  - `columnsWidth?: Record<string, number>`
- Used by the builder’s `ResultsTable` component to:
  - Reorder columns.
  - Hide/show columns.
  - Persist column widths.

Agent mindset:

- When designing flows, think about which variables should become columns:
  - Variables tied to key inputs (email, name, NPS score).
  - Hidden variables like `utm_source`, user id, campaign id.
- The engine will automatically:
  - Persist non-session variables with values.
  - Derive sensible columns from both input mappings and variables.

### 13.3 Result ID Semantics

The `Result.id` (often referred to as `resultId`) is the canonical identifier
for a submission.

Generation and lifecycle:

- At session start, the engine calls `getOrInitResult` in
  `packages/bot-engine/src/startSession.ts`:
  - If “remember user” is enabled and a previous Result exists for this user, it
    reuses that `resultId`.
  - Otherwise, it generates a new id via `createId()`.
- The `resultId` is stored in the in-session state (`TypebotInSession`) and
  reused on each upsert.
- On upsert (`upsertResult` in
  `packages/bot-engine/src/queries/upsertResult.ts`), this id is used as:
  - The primary key for the `Result` row.
  - The foreign key for `Answer`, `VisitedEdge`, `SetVariableHistoryItem`, and
    `Log` rows.

Set Variable and `Result ID`:

- Set Variable has a value type `"Result ID"` (see
  `packages/blocks/logic/src/setVariable/constants.ts`).
- In `executeSetVariable`:
  - `"Result ID"` and `"User ID"` both resolve to
    `state.typebotsQueue[0].resultId ?? createId()`.
  - The resolved id is stored into the target variable’s `value`.
- Combining this with “Save in results”:
  - If the target variable is non-session, the `resultId` will be persisted in
    `Result.variables` and appear as a column.

Usage patterns for agents:

- When external systems need to correlate submissions:
  - Add a Set Variable block with:
    - `type: "Result ID"`.
    - `options.variableId` pointing to a variable like `"Result ID"`.
    - “Save in results” enabled for that variable.
  - Optionally send that variable to external integrations (CRMs, data
    warehouses).
- For debugging and replay:
  - The `SetVariableHistoryItem` entries linked to `resultId` record how
    variables evolved during the flow.

Taken together:

- Variables + `isSessionVariable` control what is persisted.
- `Result` and friends define how submissions are stored and displayed.
- `resultId` is the glue between the session, Results table, logs, and any
  external references you create via Set Variable.

### 13.4 Logs per Result

Execution logs are stored per result and exposed both in the builder UI and via
the API.

Schemas:

- Persisted logs use `logSchema` from `packages/logs/src/schemas.ts`:
  - `id: string`
  - `createdAt: Date`
  - `resultId: string`
  - `status: string` (logical status such as `"error"`, `"success"`, `"info"`)
  - `description: string` (human-readable message)
  - `details: string | null` (optional details, shortened before persistence)
  - `context: string | null` (optional grouping/extra metadata)
- In-session logs use `logInSessionSchema`:
  - `status?: string`
  - `description: string`
  - `details?: string`
  - `context?: string`

How logs are produced:

- During chat execution:
  - The engine may emit `logs?: LogInSession[]` in the chat response.
  - Clients can also send `clientLogs?: LogInSession[]` back to the server.
- Persistence:
  - `saveLog` in `packages/bot-engine/src/logs/saveLog.ts` writes single log
    entries into `prisma.log` using `resultId`, `status`, `description`,
    `details`.
  - `upsertResult` in `packages/bot-engine/src/queries/upsertResult.ts` can
    bulk-create logs from `ContinueChatResponse.logs`, ensuring they are linked
    to the corresponding `Result`.

How logs are consumed:

- Builder UI:
  - Each result row has a “See logs” action that opens a logs dialog.
  - The dialog calls `GET /v1/typebots/{typebotId}/results/{resultId}/logs`
    (`getResultLogs` in `apps/builder/src/features/results/api/router.ts`),
    which returns `{ logs: Log[] }`.
- Programmatic access:
  - Use the same `/logs` endpoint to inspect failures in integrations such as
    Send email, Google Sheets, Webhook/HTTP Request, OpenAI, etc.

Agent mindset:

- When designing flows that rely heavily on integrations:
  - Expect that failures will be visible through per-result logs.
  - Prefer to surface meaningful `description` strings and structured `details`
    to make debugging easier.

### 13.5 Transcript and Replay

The transcript for a result is **not** stored as raw text. Instead, it is
recomputed on demand by replaying the flow using the stored answers, visited
edges and variable history.

Data used for transcripts:

- `Answer` / `AnswerV2`:
  - Per-block answers sorted by `createdAt`.
  - May include `attachedFileUrls` for file inputs or rich inputs.
- `VisitedEdge`:
  - Captures the ordered sequence of `edgeId`s traversed during the run.
- `SetVariableHistoryItem`:
  - Captures variable changes applied by Set Variable blocks, including
    `blockIndex` to know when to apply them during replay.
- `TypebotInSession`:
  - The published Typebot graph (`groups`, `edges`, `events`, `variables`)
    parsed into the in-session schema.

Transcript computation:

- Implemented in `computeResultTranscript` in
  `packages/bot-engine/src/computeResultTranscript.ts`.
- `handleGetResultTranscript` in
  `apps/builder/src/features/results/api/handleGetResultTranscript.ts`:
  - Loads the published Typebot and the `Result`’s answers, visitedEdges and
    setVariableHistory.
  - Sorts and normalizes these into arrays.
  - Calls `computeResultTranscript` to obtain `TranscriptMessage[]`.
- Transcript shape (see results API router):
  - Each item has:
    - `role: "bot" | "user"`
    - `type: "text" | "image" | "video" | "audio"`
    - `text?: string`
    - `image?: string`
    - `video?: string`
    - `audio?: string`

Replay semantics:

- The engine:
  - Determines the first edge from the START event (or first block in legacy
    flows).
  - Walks groups and blocks in order, applying `SetVariableHistoryItem`
    snapshots at the right `blockIndex`.
  - For each bubble block, pushes a `"bot"` message based on its content and
    current variables.
  - For each input block, consumes the next `Answer`, binds it to variables and
    follows the appropriate edge.
  - For Condition, A/B test and RETURN blocks, uses `VisitedEdge` to know which
    path was taken.
  - For Typebot Link blocks, enters and exits nested flows while keeping a
    `typebotsQueue` and `resumeEdgeId`.
- The process continues until no more edges are available, yielding the full
  transcript.

Behavior notes:

- Because transcripts are recomputed:
  - If the flow changes after a result is collected, replay may diverge from
    what the original user saw.
  - For a given Typebot version and captured data (answers, visitedEdges,
    setVariableHistory), transcripts are deterministic.
- The builder uses the transcript endpoint
  (`GET /v1/typebots/{typebotId}/results/{resultId}/transcript`) to power the
  “Open transcript” view in the Results UI.

Agent mindset:

- When reasoning about past runs:
  - Use `Result` + `Answer` + `VisitedEdge` + `SetVariableHistoryItem` to
    reconstruct what happened.
  - Treat transcripts as derived views, not as primary storage.
  - Use logs plus transcripts together to understand both **what** the user and
    bot said and **what** the engine and integrations did at each step.
