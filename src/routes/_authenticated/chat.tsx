import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/iafoa-logo.jpeg.asset.json";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [
    { title: "Data Assistant — Indus Anantya Apartment" },
    { name: "description", content: "Ask questions about current apartment operations and records." },
    { property: "og:title", content: "Data Assistant — Indus Anantya Apartment" },
    { property: "og:description", content: "Read-only answers about apartment operations." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: DataChat,
});

type SessionChat = { id: string; title: string; messages: UIMessage[] };
function DataChat() {
  const [chats, setChats] = useState<SessionChat[]>([{ id: "initial", title: "New conversation", messages: [] }]);
  const [active, setActive] = useState("initial");
  const current = chats.find((chat) => chat.id === active);
  const update = useCallback((id: string, messages: UIMessage[]) => {
    setChats((previous) => previous.map((chat) => {
      if (chat.id !== id) return chat;
      const first = messages.find((message) => message.role === "user")?.parts.find((part) => part.type === "text");
      return { ...chat, messages, title: first?.type === "text" ? first.text.slice(0, 48) : chat.title };
    }));
  }, []);
  const create = () => {
    const id = crypto.randomUUID();
    setChats((previous) => [...previous, { id, title: "New conversation", messages: [] }]);
    setActive(id);
  };
  const remove = (id: string) => {
    const remaining = chats.filter((chat) => chat.id !== id);
    if (!remaining.length) {
      const next = { id: crypto.randomUUID(), title: "New conversation", messages: [] };
      setChats([next]); setActive(next.id);
    } else { setChats(remaining); if (active === id) setActive(remaining[0]?.id ?? "initial"); }
  };
  return <AppShell title="Data Assistant" description="Indus Anantya Apartment">
    <div className="grid min-w-0 gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="min-w-0 border-b border-border pb-4 md:border-b-0 md:border-r md:pr-4">
        <Button className="mb-3 w-full gap-2" onClick={create}><Plus className="size-4" />New conversation</Button>
        <div className="flex gap-2 overflow-x-auto md:flex-col">
          {chats.map((chat) => <div key={chat.id} className="flex min-w-40 items-center gap-1 md:min-w-0">
            <Button variant={active === chat.id ? "secondary" : "ghost"} className="min-w-0 flex-1 justify-start gap-2" onClick={() => setActive(chat.id)} aria-pressed={active === chat.id}>
              <MessageSquare className="size-4 shrink-0" /><span className="truncate">{chat.title}</span>
            </Button>
            <Button variant="ghost" size="icon" title="Delete conversation" aria-label={`Delete ${chat.title}`} onClick={() => remove(chat.id)}><Trash2 className="size-4" /></Button>
          </div>)}
        </div>
      </aside>
      {current && <ChatWindow key={current.id} chat={current} onUpdate={update} />}
    </div>
  </AppShell>;
}

function ChatWindow({ chat, onUpdate }: { chat: SessionChat; onUpdate: (id: string, messages: UIMessage[]) => void }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    headers: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    },
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? `The assistant could not respond (${response.status}).`);
      }
      return response;
    },
  }), []);
  const { messages, sendMessage, status, error, stop, clearError } = useChat({ id: chat.id, messages: chat.messages, transport });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => { onUpdate(chat.id, messages); }, [chat.id, messages, onUpdate]);
  useEffect(() => { if (!busy) textarea.current?.focus(); }, [busy]);
  useEffect(() => () => { void stop(); }, [stop]);
  return <div className="flex h-[650px] min-h-96 min-w-0 flex-col md:h-[calc(100dvh-200px)]">
    <Conversation className="min-h-0">
      <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-1">
        {!messages.length && <ConversationEmptyState title="Indus Anantya Data Assistant" description="" icon={<img src={logo.url} alt="IAFOA" className="h-20 w-auto object-contain" />} />}
        {messages.map((message) => <Message key={message.id} from={message.role}>
          <MessageContent>
            {message.parts.map((part, index) => {
              if (part.type === "text") return <MessageResponse key={index}>{part.text}</MessageResponse>;
              if (part.type === "reasoning") return <Reasoning key={index} defaultOpen={false} isStreaming={part.state === "streaming"}><ReasoningTrigger /><ReasoningContent>{part.text}</ReasoningContent></Reasoning>;
              if (isToolUIPart(part)) return <Tool key={index} defaultOpen={false}>
                {part.type === "dynamic-tool" ? <ToolHeader type={part.type} toolName={part.toolName} state={part.state} title="Apartment records" /> : <ToolHeader type={part.type} state={part.state} title="Apartment records" />}
                <ToolContent><ToolInput input={part.input} /><ToolOutput output={part.output} errorText={part.errorText} /></ToolContent>
              </Tool>;
              return null;
            })}
          </MessageContent>
        </Message>)}
        {status === "submitted" && <Shimmer>Checking apartment records…</Shimmer>}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
    {error && <p role="alert" className="my-3 text-sm text-destructive">{error.message}</p>}
    <div className="mx-auto mt-4 w-full max-w-3xl">
      <PromptInput onSubmit={async () => {
        const value = text.trim();
        if (busy || !value) return;
        clearError(); setText(""); textarea.current?.focus();
        await sendMessage({ text: value });
      }}>
        <PromptInputTextarea ref={textarea} value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask about residents, staff, tasks or occupancy…" aria-label="Ask about apartment data" autoFocus />
        <PromptInputFooter className="justify-end"><PromptInputSubmit status={status} disabled={!busy && !text.trim()} onStop={() => { void stop(); textarea.current?.focus(); }} /></PromptInputFooter>
      </PromptInput>
    </div>
  </div>;
}