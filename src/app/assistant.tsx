"use client";

import { AssistantRuntimeProvider, AuiConfig, Tools, type SuggestionAdapter } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { useEffect, useMemo, useRef } from "react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { ChatHeader } from "@/components/healtrip/chat-header";
import { followUpsFor } from "@/components/healtrip/follow-ups";
import { toolkit } from "@/components/healtrip/toolkit";
import { DICTIONARIES } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";

export const Assistant = () => {
  const locale = useLocale();
  const localeRef = useRef(locale);
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  const suggestion = useMemo<SuggestionAdapter>(
    () => ({
      async generate({ messages }) {
        return followUpsFor(messages, DICTIONARIES[localeRef.current]);
      },
    }),
    [],
  );

  // Every tool runs on the server, so the client never needs to resubmit tool results.
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
    adapters: { suggestion },
  });
  const config = AuiConfig({ tools: Tools({ toolkit }) });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <div className="flex h-dvh flex-col">
        <ChatHeader />
        <div className="min-h-0 flex-1">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
};
