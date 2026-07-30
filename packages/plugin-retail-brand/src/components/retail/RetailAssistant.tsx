import { useMemo, useCallback } from "react";
import { useTheme } from "@trustgraph/trustkit";
import { useRetailOrchestrator } from "../../hooks/useRetailOrchestrator";
import { useRetailContext } from "../../hooks/useRetailContext";
import { ChatPanel } from "./ChatPanel";
import { ContextPanel } from "./ContextPanel";
import { BuildPanel } from "./BuildPanel";
import { BrowseGrid } from "./BrowseGrid";
import { CartPanel } from "./CartPanel";
import type { ChatMessage } from "../../hooks/useRetailChat";
import type { HistoryEntry } from "../../hooks/useRetailPrompt";

export interface RetailAssistantProps {
  collection?: string;
}

const SUGGESTED_PROMPTS = [
  "I want to build a gaming PC for around $1500. Can you suggest compatible components?",
  "I need some gear for a camping trip next weekend.",
  "What sleeping bags do you have?",
  "I want to build an image editing workstation, budget $1700.",
  "What do you sell?",
  "Do you have any outdoor cooking equipment?",
];

let msgCounter = 0;
function toDisplayMessages(history: HistoryEntry[]): ChatMessage[] {
  return history.map((h) => ({
    id: `hist_${++msgCounter}`,
    role: h.role,
    text: h.text,
    timestamp: Date.now(),
  }));
}

function detectFlow(history: HistoryEntry[]) {
  const allText = history.filter((m) => m.role === "user").map((m) => m.text).join(" ");
  if (/\b(build|assemble|gaming pc|gaming computer)\b/i.test(allText)) return "build" as const;
  if (/\b(gift|present)\b/i.test(allText)) return "gift" as const;
  if (/\b(camping|outdoor|hiking|trip|gear)\b/i.test(allText)) return "kit" as const;
  if (/\b(compare|vs|versus|which is better)\b/i.test(allText)) return "compare" as const;
  return "browse" as const;
}

export function RetailAssistant(_props: RetailAssistantProps) {
  const { theme } = useTheme();
  const orch = useRetailOrchestrator();
  const context = useRetailContext();

  const allHistory = useMemo(() => {
    const generic = orch.genericHistory;

    if (orch.activeFlow === "generic") {
      return generic;
    }

    const buildHist = orch.build.history;
    let combined = generic;

    if (buildHist.length > 0 && buildHist[0].role === "user") {
      const lastGenericUser = [...generic].reverse().find((h) => h.role === "user");
      if (lastGenericUser && lastGenericUser.text === buildHist[0].text) {
        combined = [...generic, ...buildHist.slice(1)];
      } else {
        combined = [...generic, ...buildHist];
      }
    } else {
      combined = [...generic, ...buildHist];
    }

    if (orch.activeFlow === "checkout") {
      const checkout = orch.checkoutHistory.filter(
        (h) => !(h.role === "user" && h.text.startsWith("["))
      );
      combined = [...combined, ...checkout];
    }

    return combined;
  }, [orch.activeFlow, orch.genericHistory, orch.build.history, orch.checkoutHistory]);

  const displayMessages = useMemo(
    () => toDisplayMessages(allHistory),
    [allHistory],
  );

  const streamingMsg: ChatMessage | null = orch.isThinking
    ? {
        id: "streaming",
        role: "assistant",
        text: "",
        timestamp: Date.now(),
        isStreaming: true,
      }
    : null;

  const allMessages = streamingMsg
    ? [...displayMessages, streamingMsg]
    : displayMessages;

  const flow = detectFlow(allHistory);
  const hasBuild = orch.activeFlow === "pc-build" && (
    orch.build.build.activity !== null || Object.keys(orch.build.build.slots).length > 0
  );
  const hasCheckout = orch.activeFlow === "checkout";
  const hasBrowse = orch.activeFlow === "generic" && orch.browseProducts.length > 0;
  const hasCenterPanel = hasBuild || hasCheckout || hasBrowse;

  const handlePlaceOrder = useCallback(() => {
    orch.placeOrder();
  }, [orch]);

  return (
    <div
      style={{
        display: "flex",
        height: "var(--page-height)",
        overflow: "hidden",
      }}
    >
      {/* Chat panel */}
      <div
        style={{
          width: hasCenterPanel ? 360 : undefined,
          flex: hasCenterPanel ? undefined : 1,
          flexShrink: 0,
          minWidth: 300,
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${theme.border.default}`,
        }}
      >
        <ChatPanel
          messages={allMessages}
          onSend={orch.send}
          isQuerying={orch.isThinking}
          error={orch.error}
          suggestedPrompts={SUGGESTED_PROMPTS}
        />
      </div>

      {/* Build panel — PC build flow */}
      {hasBuild && (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${theme.border.default}`,
            overflow: "hidden",
          }}
        >
          <BuildPanel
            build={orch.build.build}
            recommendations={orch.build.recommendations}
            activeSlot={orch.build.activeSlot}
            lastMessage={orch.build.lastMessage}
            isThinking={orch.build.isThinking}
            isQuerying={orch.build.isQuerying}
            onSelectProduct={orch.selectProduct}
          />
        </div>
      )}

      {/* Cart panel — checkout flow */}
      {hasCheckout && (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${theme.border.default}`,
            overflow: "hidden",
          }}
        >
          <CartPanel
            items={orch.cart.items}
            buildTotal={orch.cart.buildTotal}
            extrasTotal={orch.cart.extrasTotal}
            total={orch.cart.total}
            isFinalized={orch.cart.isFinalized}
            browseProducts={orch.browseProducts}
            lastMessage={orch.checkoutMessage}
            isThinking={orch.isThinking}
            onAddExtra={orch.addExtra}
            onRemoveExtra={orch.removeExtra}
            onPlaceOrder={handlePlaceOrder}
          />
        </div>
      )}

      {/* Browse panel — generic product browsing */}
      {hasBrowse && !hasBuild && !hasCheckout && (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${theme.border.default}`,
            overflow: "auto",
          }}
        >
          <BrowseGrid products={orch.browseProducts} />
        </div>
      )}

      {/* Context panel */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          overflowY: "auto",
          background: theme.surface.card,
        }}
      >
        <ContextPanel flow={flow} context={context} />
      </div>
    </div>
  );
}
