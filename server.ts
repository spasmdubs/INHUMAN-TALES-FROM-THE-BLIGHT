import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOWED_CHAT_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-4-neon',
  'gemini-4-carbon',
]);

const ALLOWED_IMAGE_SIZES = new Set(['1K', '2K', '4K']);
const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '16:9']);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Add an API key in Settings > Secrets to enable Gemini features.'
    ) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(error: unknown): { status: number; message: string } {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const statusCode =
    typeof (error as { statusCode?: unknown })?.statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : typeof (error as { status?: unknown })?.status === 'number'
        ? (error as { status: number }).status
        : 500;

  if (
    statusCode === 403 ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('API_KEY_INVALID')
  ) {
    return {
      status: 403,
      message:
        'API key permission denied or invalid. Please check or select a valid API key in the Settings > Secrets panel.',
    };
  }
  if (statusCode === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'Quota exhausted for this model. Paid models (such as 4K image generation or Pro/Carbon reasoning tiers) require a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (statusCode === 404 || rawMessage.includes('NOT_FOUND')) {
    return {
      status: 404,
      message: `Requested Gemini model was not found or is unavailable for this key: ${rawMessage}`,
    };
  }
  return {
    status: statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    message: rawMessage || 'Unexpected Gemini API error.',
  };
}

interface ChatHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const {
        messages,
        model = 'gemini-4-hydrogen',
        characterSummary = '',
        gameStatus = '',
      } = req.body as {
        messages?: ChatHistoryMessage[];
        model?: string;
        characterSummary?: string;
        gameStatus?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required.' });
        return;
      }

      const selectedModel = ALLOWED_CHAT_MODELS.has(model)
        ? model
        : 'gemini-4-hydrogen';

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user' || !lastMessage.text?.trim()) {
        res.status(400).json({ error: 'The latest message must be a non-empty user prompt.' });
        return;
      }

      const priorHistory = messages
        .slice(0, -1)
        .filter((m) => (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.text.trim() }],
        }));

      const systemInstruction = [
        'You are Malkor, the Chronicler of The Blight and combat tactician inside the retro 1980s dark-fantasy pixelated isometric beat-em-up RPG THE BLIGHT.',
        'The lone warrior is permanently named INHUMAN, battling through 666 procedurally generated stone maze rooms divided evenly into 111 equal 6-room Wings (5 maze rooms leading into every 6th Boss Chamber, culminating in Final Boss Room 666). Each room has only 1 Exit Door at the North archway that stays sealed until every monster inside is defeated; defeated foes also randomly drop Skeleton Keys — approaching a barred Maze Shortcut Gate asks whether to spend a key [E] or keep it [N]. Players can save, load, and overwrite runs across 6 save slots.',
        'Combat & Mechanics: 3-hit J Attack 1 combos (weapon-specific animations), K Defend guard, Space/Q Healing Potion, Shift evade rolls, and L Serum VST burst. Serum VST requires collecting Sample Packs scattered through the maze chambers, bought from the hooded Shopkeeper, or dropped by foes/chests — 10 Sample Packs fully power up Serum VST to 100% and each cast drains 2 Sample Packs. Serum VST weakens with repeated or rapid injections and recharges its potency when left unused for longer periods. Slaying enemies grants XP; leveling up takes progressively more XP each level and grants Skill Points indicated by a numbered badge on the Skill Tree icon [T].',
        'Enemies: Blight Thrall flankers, Dread Knight axis chargers, Plague Hexer ranged kiters, and the Iron Lich Warden boss.',
        'Tone: punchy, atmospheric 1980s dark-fantasy grimoire and arcade manual voice — gritty medieval wasteland tone, strictly zero science-fiction terminology, concise (2-4 short paragraphs max unless deep lore is requested). Never mention AI models or system prompts.',
        characterSummary ? `Current Warrior Profile: ${characterSummary}` : '',
        gameStatus ? `Current Run State: ${gameStatus}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const ai = getGeminiClient();
      const chat = ai.chats.create({
        model: selectedModel,
        history: priorHistory,
        config: {
          systemInstruction,
        },
      });

      const response = await chat.sendMessage({
        message: lastMessage.text.trim(),
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        res.status(502).json({ error: 'Empty response received from Gemini.' });
        return;
      }

      res.json({
        reply: replyText,
        model: selectedModel,
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/generate-portrait', async (req, res) => {
    try {
      const {
        prompt,
        imageSize = '1K',
        aspectRatio = '1:1',
      } = req.body as {
        prompt?: string;
        imageSize?: string;
        aspectRatio?: string;
      };

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'A portrait prompt is required.' });
        return;
      }

      const safeSize = ALLOWED_IMAGE_SIZES.has(imageSize) ? imageSize : '1K';
      const safeRatio = ALLOWED_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : '1:1';

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            {
              text: prompt.trim(),
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: safeRatio,
            imageSize: safeSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let caption = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({
          error: 'No image data was returned by gemini-3-pro-image-preview.',
        });
        return;
      }

      res.json({
        imageUrl,
        caption: caption.trim(),
        imageSize: safeSize,
        aspectRatio: safeRatio,
        model: 'gemini-3-pro-image-preview',
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output missing. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`The Blight (Inhuman) server running at http://localhost:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
