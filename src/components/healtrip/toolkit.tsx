"use client";

import { defineToolkit } from "@assistant-ui/react";

/**
 * How the chat renders the agent's tool calls. Keys must match TOOL_NAMES in
 * `@/lib/agent-contracts`; each entry is `type: "backend"` because the tools run on the
 * server and the UI only renders their results.
 */
export const toolkit = defineToolkit({});
