import { FormEvent, useEffect, useRef, useState } from 'react';
import { Download, Image as ImageIcon, MessageSquare, RefreshCw, Send, X } from 'lucide-react';
import {
  CharacterConfig,
  HERO_NAME,
  buildPortraitPrompt,
  describeCharacterSummary,
} from '../game/character';
import { HudSnapshot } from '../game/engine';

export type ArchiveTab = 'portrait' | 'oracle';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

interface ArcadeArchiveModalProps {
  initialTab: ArchiveTab;
  character: CharacterConfig;
  hud: HudSnapshot;
  onClose: () => void;
}

type ImageSizeOption = '1K' | '2K' | '4K';
type AspectRatioOption = '1:1' | '3:4' | '16:9';

const CHAT_MODELS = [
  { id: 'gemini-4-hydrogen', label: 'General (Hydrogen)', note: 'Balanced lore & tactics' },
  { id: 'gemini-3.1-flash-lite', label: 'Fast (Flash Lite)', note: 'Quick combat tips' },
  { id: 'gemini-4-neon', label: 'Complex (Neon)', note: 'Advanced build & room strategy' },
  { id: 'gemini-4-carbon', label: 'Deep Reasoning (Carbon)', note: 'Deep multi-step analysis' },
] as const;

const STARTER_PROMPTS = [
  'How do I counter Dread Knights and Plague Hexers together?',
  'Write an 80s dark-fantasy manual backstory for Inhuman.',
  'How should I manage Serum VST potency and gather 10 Sample Packs fast?',
];

export function ArcadeArchiveModal({
  initialTab,
  character,
  hud,
  onClose,
}: ArcadeArchiveModalProps) {
  const [tab, setTab] = useState<ArchiveTab>(initialTab);

  // Portrait Forge State (1K, 2K, 4K)
  const [portraitPrompt, setPortraitPrompt] = useState(() => buildPortraitPrompt(character));
  const [imageSize, setImageSize] = useState<ImageSizeOption>('1K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('1:1');
  const [portraitLoading, setPortraitLoading] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<{
    url: string;
    size: ImageSizeOption;
    ratio: AspectRatioOption;
    caption: string;
  } | null>(null);

  // Blight Chronicler Multi-Turn Chat State
  const [chatModel, setChatModel] = useState<string>('gemini-4-hydrogen');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hail, ${HERO_NAME}. I am Malkor, Chronicler of The Blight. Ask me for tactics across the 666 maze rooms (111 Wings leading to Boss Chambers), how to loot Skeleton Keys for maze shortcuts, or how to gather 10 Sample Packs to power up your Serum VST.`,
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  const handleSyncPrompt = () => {
    setPortraitPrompt(buildPortraitPrompt(character));
    setPortraitError(null);
  };

  const handleGeneratePortrait = async (e: FormEvent) => {
    e.preventDefault();
    if (!portraitPrompt.trim() || portraitLoading) return;
    setPortraitLoading(true);
    setPortraitError(null);

    try {
      const res = await fetch('/api/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: portraitPrompt.trim(),
          imageSize,
          aspectRatio,
        }),
      });
      const data = (await res.json()) as {
        imageUrl?: string;
        caption?: string;
        imageSize?: ImageSizeOption;
        aspectRatio?: AspectRatioOption;
        error?: string;
      };
      if (!res.ok || !data.imageUrl) {
        setPortraitError(data.error || 'Failed to generate dark-fantasy portrait.');
        return;
      }
      setGeneratedImage({
        url: data.imageUrl,
        size: data.imageSize ?? imageSize,
        ratio: data.aspectRatio ?? aspectRatio,
        caption: data.caption ?? '',
      });
    } catch {
      setPortraitError('Network error reaching the portrait generator server.');
    } finally {
      setPortraitLoading(false);
    }
  };

  const sendChatMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const nextThread = [...messages, userMsg];
    setMessages(nextThread);
    setChatInput('');
    setChatError(null);
    setChatLoading(true);

    try {
      const payloadHistory = nextThread
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadHistory,
          model: chatModel,
          characterSummary: describeCharacterSummary(character),
          gameStatus: `Room ${hud.roomNumber}/${hud.totalRooms} (Wing ${hud.wingNumber}/${hud.totalWings}, ${hud.sectorName}, ${hud.roomLocked ? 'Exit Sealed' : 'Exit Open'}), Keys ${hud.keys}, Level ${hud.level}, Sample Packs ${hud.presetsCollected}/${hud.presetsMax}, Serum VST Potency ${Math.round(hud.serumPotency * 100)}%, HP ${hud.hp}/${hud.maxHp}`,
        }),
      });

      const data = (await res.json()) as { reply?: string; model?: string; error?: string };
      if (!res.ok || !data.reply) {
        setChatError(data.error || 'Failed to reach the Blight Chronicler.');
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now()}`,
          role: 'model',
          text: data.reply!,
          modelUsed: data.model,
        },
      ]);
    } catch {
      setChatError('Network error communicating with the Blight Chronicler.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendChatMessage(chatInput);
  };

  return (
    <div
      data-testid="blight-chronicles-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090706]/92 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Blight Chronicles — Portrait Forge and Chronicler"
    >
      <div className="flex flex-col w-full max-w-5xl h-[88vh] max-h-[820px] bg-[#161210] border-2 border-[#574A3E] shadow-[0_24px_64px_rgba(0,0,0,0.88)] overflow-hidden">
        {/* Header & Tab Switcher (Responsive Close Button stays safely inside modal bounds) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 px-3.5 sm:px-5 py-3 bg-[#100D0B] border-b border-[#3A3028]">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <h2 className="font-pixel text-[11px] sm:text-sm text-[#FDE68A] tracking-wide truncate">
              BLIGHT CHRONICLES
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Blight Chronicles"
              className="md:hidden inline-flex items-center justify-center w-8 h-8 text-[#D6D3D1] hover:text-[#F5EFE6] bg-[#1E1916] border border-[#4D4137] hover:border-[#D97706] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2.5 min-w-0">
            <div
              role="tablist"
              aria-label="Chronicle tools"
              className="grid grid-cols-2 md:flex items-center gap-1.5 w-full md:w-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'portrait'}
                onClick={() => setTab('portrait')}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer truncate ${
                  tab === 'portrait'
                    ? 'bg-[#2E241A] text-[#FDE68A] border-[#D97706]'
                    : 'bg-[#1A1512] text-[#A8A29E] border-[#3E342C] hover:text-[#F5EFE6]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Key Art (1K–4K)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'oracle'}
                onClick={() => setTab('oracle')}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer truncate ${
                  tab === 'oracle'
                    ? 'bg-[#2E241A] text-[#FDE68A] border-[#D97706]'
                    : 'bg-[#1A1512] text-[#A8A29E] border-[#3E342C] hover:text-[#F5EFE6]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Chronicler</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Blight Chronicles"
              className="hidden md:inline-flex items-center justify-center w-9 h-9 text-[#D6D3D1] hover:text-[#F5EFE6] bg-[#1E1916] border border-[#4D4137] hover:border-[#D97706] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* TAB 1: HIGH-RES DARK-FANTASY PORTRAIT GENERATOR */}
        {tab === 'portrait' && (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] flex-1 min-h-0 overflow-hidden">
            {/* Prompt & Resolution Controls */}
            <form
              onSubmit={handleGeneratePortrait}
              className="flex flex-col justify-between gap-4 p-5 bg-[#120E0C] border-b lg:border-b-0 lg:border-r border-[#3A3028] overflow-y-auto retro-scroll"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="portrait-prompt-textarea"
                    className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]"
                  >
                    Dark-Fantasy Cover Prompt
                  </label>
                  <button
                    type="button"
                    onClick={handleSyncPrompt}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#FDE68A] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" aria-hidden="true" />
                    Sync from {HERO_NAME}
                  </button>
                </div>

                <textarea
                  id="portrait-prompt-textarea"
                  rows={6}
                  value={portraitPrompt}
                  onChange={(e) => setPortraitPrompt(e.target.value)}
                  className="w-full p-3 text-sm leading-relaxed text-[#F5EFE6] bg-[#1A1512] border border-[#4D4137] focus:border-[#D97706] focus:outline-none resize-none"
                  placeholder="Describe your 1980s dark-fantasy painting of Inhuman in The Blight..."
                />

                {/* Image Size Selector: 1K, 2K, 4K */}
                <div className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">
                    Image Resolution
                  </span>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Image size">
                    {(['1K', '2K', '4K'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        role="radio"
                        aria-checked={imageSize === sz}
                        onClick={() => setImageSize(sz)}
                        className={`py-2 text-xs font-pixel border transition-colors cursor-pointer ${
                          imageSize === sz
                            ? 'bg-[#D97706] text-[#100D0B] border-[#FDE68A]'
                            : 'bg-[#1A1512] text-[#D6D3D1] border-[#3E342C] hover:border-[#84CC16]'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">
                    Aspect Ratio
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: '1:1', label: '1:1 Square' },
                        { id: '3:4', label: '3:4 Poster' },
                        { id: '16:9', label: '16:9 Banner' },
                      ] as const
                    ).map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id)}
                        className={`py-2 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          aspectRatio === ar.id
                            ? 'bg-[#2E241A] text-[#FDE68A] border-[#D97706]'
                            : 'bg-[#1A1512] text-[#A8A29E] border-[#3E342C] hover:border-[#84CC16]'
                        }`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#322923]">
                <button
                  type="submit"
                  disabled={portraitLoading || !portraitPrompt.trim()}
                  className="w-full py-3 px-4 font-pixel text-xs text-[#100D0B] bg-[#D97706] border-2 border-[#FDE68A] hover:bg-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {portraitLoading ? `PAINTING ${imageSize}...` : `PAINT ${imageSize} ART`}
                </button>
                <p className="text-[11px] text-[#A8A29E] leading-snug">
                  Generates classic 1980s sword-and-sorcery key art at 1K, 2K, or 4K.
                </p>
              </div>
            </form>

            {/* Generated Artwork Canvas */}
            <div className="flex flex-col items-center justify-center p-6 bg-[#0D0A09] overflow-y-auto retro-scroll">
              {portraitError && (
                <div
                  role="alert"
                  className="w-full max-w-lg mb-4 p-4 bg-[#291516] border border-[#DC2626] text-sm text-[#FECDD3]"
                >
                  <p className="font-semibold text-[#FDA4AF] mb-1">Portrait Generation Unavailable</p>
                  <p className="leading-relaxed">{portraitError}</p>
                </div>
              )}

              {portraitLoading ? (
                <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                  <div className="w-12 h-12 border-4 border-[#3E342C] border-t-[#D97706] animate-spin" />
                  <p className="font-pixel text-xs text-[#FDE68A]">PAINTING {imageSize} KEY ART...</p>
                  <p className="text-xs text-[#A8A29E]">
                    Rendering {HERO_NAME} in classic 1980s dark-fantasy illustration style.
                  </p>
                </div>
              ) : generatedImage ? (
                <div className="flex flex-col items-center gap-4 w-full max-w-xl">
                  <div className="border-2 border-[#574A3E] bg-[#14100E] p-2 shadow-2xl">
                    <img
                      src={generatedImage.url}
                      alt={`Generated ${generatedImage.size} portrait of ${HERO_NAME}`}
                      referrerPolicy="no-referrer"
                      className="max-h-[54vh] w-auto object-contain block"
                    />
                  </div>
                  <div className="flex items-center justify-between w-full gap-3 text-xs text-[#A8A29E]">
                    <span>
                      {HERO_NAME} · {generatedImage.size} · {generatedImage.ratio}
                    </span>
                    <a
                      href={generatedImage.url}
                      download={`the-blight-inhuman-${generatedImage.size}.png`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-[#100D0B] bg-[#D97706] hover:bg-[#F59E0B] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      Download PNG
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center max-w-md space-y-3 p-6 border border-[#3A3028] bg-[#14100E]">
                  <ImageIcon className="w-10 h-10 text-[#84CC16]" aria-hidden="true" />
                  <h3 className="font-pixel text-xs text-[#F5EFE6]">DARK-FANTASY KEY ART</h3>
                  <p className="text-sm text-[#A8A29E] leading-relaxed">
                    Your customized {HERO_NAME} appearance (class, hair, face, skin, eyes, medieval
                    armor, boots, and relics) is pre-loaded into the prompt. Choose 1K, 2K, or 4K
                    resolution to paint 1980s cover art.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BLIGHT CHRONICLER MULTI-TURN CHAT */}
        {tab === 'oracle' && (
          <div className="flex flex-col flex-1 min-h-0 bg-[#100D0B]">
            {/* Model Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[#15110E] border-b border-[#3A3028]">
              <div className="text-xs text-[#A8A29E]">
                <span className="font-semibold text-[#F5EFE6]">Malkor, Chronicler of The Blight</span>
                <span className="mx-2" aria-hidden="true">
                  ·
                </span>
                <span>Maze Tactics, Serum VST Lore &amp; Bestiary</span>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="oracle-model-select"
                  className="text-xs font-semibold text-[#A8A29E] whitespace-nowrap"
                >
                  Chronicle Tier
                </label>
                <select
                  id="oracle-model-select"
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-[#F5EFE6] bg-[#1E1916] border border-[#4D4137] focus:border-[#D97706] focus:outline-none cursor-pointer"
                >
                  {CHAT_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {m.note}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable Conversation Thread */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto retro-scroll px-5 py-4 space-y-4"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-4 py-3 text-sm leading-relaxed border ${
                      msg.role === 'user'
                        ? 'bg-[#2C231A] border-[#D97706] text-[#F5EFE6]'
                        : 'bg-[#1A1512] border-[#443A32] text-[#E7E0D6]'
                    }`}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-1 text-[#A8A29E]">
                      {msg.role === 'user' ? HERO_NAME : 'MALKOR · CHRONICLER'}
                    </div>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 text-xs font-pixel text-[#FDE68A] bg-[#1A1512] border border-[#443A32]">
                    UNSEALING BLIGHT CHRONICLES...
                  </div>
                </div>
              )}

              {chatError && (
                <div
                  role="alert"
                  className="p-3.5 bg-[#291516] border border-[#DC2626] text-xs sm:text-sm text-[#FECDD3]"
                >
                  {chatError}
                </div>
              )}
            </div>

            {/* Quick Starter Prompts */}
            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-2 px-5 pb-2.5">
                {STARTER_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={chatLoading}
                    onClick={() => void sendChatMessage(q)}
                    className="px-3 py-1.5 text-xs text-[#D6D3D1] bg-[#1A1512] border border-[#3E342C] hover:border-[#D97706] hover:text-[#FDE68A] transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Bar */}
            <form
              onSubmit={handleChatSubmit}
              className="flex items-center gap-2.5 px-5 py-3.5 bg-[#14100E] border-t border-[#3A3028]"
            >
              <label htmlFor="oracle-chat-input" className="sr-only">
                Ask the Blight Chronicler
              </label>
              <input
                id="oracle-chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Malkor about maze chambers, Serum VST potency, or the Iron Lich Warden..."
                className="flex-1 px-3.5 py-2.5 text-sm text-[#F5EFE6] bg-[#1A1512] border border-[#4D4137] focus:border-[#D97706] focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 font-pixel text-xs text-[#100D0B] bg-[#D97706] border-2 border-[#FDE68A] hover:bg-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                SEND
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
