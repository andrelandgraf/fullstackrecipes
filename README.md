# S2 AI Chat - Resumable AI Chat System

A production-ready resumable AI chat system using DurableAgent, S2 streams, and the AI SDK. Designed to survive network disconnects, page refreshes, laptop closings, and Vercel Fluid Compute timeouts.

## Architecture

This system implements a fully resumable AI chat experience by decoupling the AI generation from the client connection:

### Components

1. **DurableAgent (useworkflow.dev)**: Runs long-running AI workflows reliably in the background
2. **S2 (@s2-dev/streamstore)**: Provides durable, ordered streaming of AI chunks
3. **Drizzle ORM + PostgreSQL**: Persists conversation threads and messages
4. **AI SDK v5**: Powers the AI streaming and message handling
5. **Custom Transport**: Enables `useChat` to work with resumable streams

### Data Flow

```
User sends message
     ↓
POST /api/chat → Triggers DurableAgent workflow
     ↓
DurableAgent → Generates AI response → Streams chunks to S2
     ↓
Client subscribes via GET /api/chat/stream
     ↓
SSE proxy → Reads S2 records → Streams to client
```

### Key Properties

✅ Real-time streaming responses  
✅ Survives page refreshes  
✅ Survives network disconnects  
✅ Survives laptop closing  
✅ Survives Vercel Fluid Compute timeouts  
✅ Multiple devices can view the same chat  
✅ Fast resumption from any point  
✅ Perfect ordering guarantees (via S2)

## API Endpoints

### POST /api/chat

Starts or continues an AI chat workflow.

**Request:**

```json
{
  "id": "thread-id",
  "message": {
    "role": "user",
    "content": "Hello!"
  }
}
```

**Response:**

```json
{
  "success": true,
  "threadId": "thread-id",
  "streamId": "chat-thread-id-123456"
}
```

**Responsibilities:**

- Persists user message to database
- Creates or finds existing thread
- Ensures S2 stream exists
- Triggers DurableAgent workflow to generate AI response

### GET /api/chat/stream?id={threadId}

SSE endpoint that proxies S2 stream records to the client.

**Query Parameters:**

- `id`: Thread ID (required)

**Response:**
Server-Sent Events stream with AI chunks:

```
data: {"type":"text-delta","textDelta":"Hello"}

data: {"type":"text-delta","textDelta":" there"}

...
```

**Responsibilities:**

- Resolves thread's S2 stream ID
- Reads all historical records from S2
- Streams records as SSE to client
- Continues streaming new records as they arrive

## Database Schema

### threads

| Column    | Type      | Description                    |
| --------- | --------- | ------------------------------ |
| id        | UUID      | Primary key, thread identifier |
| streamId  | TEXT      | S2 stream name (unique)        |
| createdAt | TIMESTAMP | Thread creation time           |
| updatedAt | TIMESTAMP | Last update time               |

### messages

| Column    | Type      | Description                          |
| --------- | --------- | ------------------------------------ |
| id        | UUID      | Primary key, message identifier      |
| threadId  | UUID      | Foreign key to threads               |
| role      | TEXT      | Message role (user/assistant/system) |
| content   | TEXT      | JSON stringified UIMessage           |
| streamId  | TEXT      | S2 stream name for this message      |
| createdAt | TIMESTAMP | Message creation time                |

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# S2 Stream Store
S2_ACCESS_TOKEN=your_s2_access_token
S2_BASIN=your_s2_basin

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Workflow (DurableAgent) - if required
# WORKFLOW_API_KEY=your_workflow_api_key
```

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Up Database

Generate Drizzle migrations:

```bash
bunx drizzle-kit generate
```

Apply migrations:

```bash
bunx drizzle-kit migrate
```

Or push schema directly (development):

```bash
bunx drizzle-kit push
```

### 3. Configure Environment Variables

Copy the environment template and fill in your values (see above).

### 4. Start Development Server

```bash
bun dev
```

## How It Works

### Frontend (useChat + Custom Transport)

The frontend uses `useChat` from `@ai-sdk/react` with a custom transport that:

1. **On new message:**
   - Generates or retrieves a `chatId`
   - Sends POST to `/api/chat` to trigger the workflow
   - Immediately subscribes to GET `/api/chat/stream` for SSE
2. **On reconnection:**
   - Re-subscribes to GET `/api/chat/stream` with the same `chatId`
   - Receives all historical chunks plus any new ones

### Backend (DurableAgent + S2)

1. **POST /api/chat** receives a message:
   - Persists the user message to Postgres
   - Ensures a thread and S2 stream exist
   - Triggers DurableAgent to run the AI workflow

2. **DurableAgent workflow** (`chatAgent`):
   - Loads full message history from Postgres
   - Calls `streamText` with the conversation history
   - Converts to `UIMessageStream`
   - For each `UIMessageChunk`:
     - Appends to S2 stream as a record
   - On completion, persists assistant message to Postgres

3. **GET /api/chat/stream** provides SSE:
   - Resolves the thread's S2 stream ID
   - Reads all S2 records (historical + new)
   - Proxies each record as SSE to the client
   - Client receives chunks and feeds them to `useChat`

### Resumption Flow

When a client reconnects (after refresh, disconnect, etc.):

1. Client calls GET `/api/chat/stream?id=<chatId>`
2. Server reads all S2 records from the beginning
3. Client receives all historical chunks in order
4. Stream continues with any new chunks as they arrive
5. From the user's perspective, the conversation seamlessly resumes

## Comparison to Upstash Pattern

This implementation follows the Upstash resumable chat pattern but replaces:

| Upstash          | This System                |
| ---------------- | -------------------------- |
| Upstash Realtime | S2 streams                 |
| Redis history    | Postgres + Drizzle         |
| Upstash Workflow | DurableAgent               |
| Realtime channel | S2 stream per conversation |

## Development

### Run Database Migrations

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

### View Database

```bash
bunx drizzle-kit studio
```

### Debugging

- Check workflow execution in DurableAgent dashboard
- Inspect S2 streams using S2 CLI or dashboard
- View database records in Drizzle Studio
- Monitor SSE connections in browser DevTools (Network tab)

## Production Considerations

1. **S2 Stream Management:**
   - Consider implementing stream cleanup/archival for old conversations
   - Monitor S2 usage and billing

2. **Database:**
   - Add indexes on `threadId`, `streamId`, and `createdAt`
   - Implement pagination for message history
   - Consider archiving old threads

3. **Error Handling:**
   - Add retry logic for S2 operations
   - Implement exponential backoff for SSE reconnections
   - Add monitoring and alerting

4. **Security:**
   - Add authentication to protect endpoints
   - Validate user access to threads
   - Sanitize user input

5. **Scaling:**
   - S2 handles ordering and durability
   - DurableAgent handles workflow reliability
   - Consider Redis for session management if needed
   - Database connection pooling for high traffic

## License

MIT
