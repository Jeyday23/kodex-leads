# Growth MCP

The Growth MCP endpoint is served at `/api/mcp` using JSON-RPC over HTTP.

Authentication is separate from admin cookies: set `MCP_ACCESS_TOKEN` and send
`Authorization: Bearer <token>`. If the token is unset the endpoint returns
`503`; if the token is wrong it returns `401` using constant-time comparison.

Supported methods:

- `initialize`
- `ping`
- `tools/list`
- `tools/call`

Only read-only tools are exposed:

- `get_brain`
- `list_personas`
- `list_keywords`
- `list_message_pillars`
- `list_competitors`
- `get_channel_voice`
- `search_knowledge`

No `propose_*` tools are exposed through MCP. Proposal workflows stay inside
the authenticated admin CMO chat where an admin must confirm or reject each
action.
