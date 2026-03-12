import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage as ChatMessageType } from "@/types";
import { ActionCard } from "@/components/ActionCard";
import { GenerationCard } from "@/components/GenerationCard";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[75%] space-y-2", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary/15 text-foreground rounded-br-sm"
              : "bg-card text-foreground border border-border rounded-bl-sm"
          )}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action Cards */}
        {message.actions.length > 0 && (
          <div className="space-y-1.5 w-full">
            {message.actions.map((action, i) => (
              <ActionCard key={i} action={action} />
            ))}
          </div>
        )}

        {/* Generation Card */}
        {message.generation && <GenerationCard generation={message.generation} />}

        <span className="text-[10px] text-muted-foreground px-1">{time}</span>
      </div>
    </div>
  );
}

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  if (!content) return null;
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%]">
        <div className="rounded-lg px-4 py-2.5 text-sm leading-relaxed bg-card text-foreground border border-border rounded-bl-sm">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
        </div>
      </div>
    </div>
  );
}
