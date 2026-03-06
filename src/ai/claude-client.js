import { execFile } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';
import config from '../../config.js';

/**
 * Unified Claude client.
 * - If ANTHROPIC_API_KEY is set → uses the API (faster, costs money)
 * - If not → shells out to `claude -p` CLI (uses Pro Max subscription)
 */

const USE_CLI = !config.anthropicApiKey;
let apiClient = null;

function getApiClient() {
  if (!apiClient) {
    apiClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return apiClient;
}

/**
 * Send a message to Claude and get a text response.
 * @param {object} opts
 * @param {string} opts.system - System prompt
 * @param {Array} opts.messages - Conversation messages [{role, content}]
 * @param {number} opts.maxTokens - Max response tokens (default 4096)
 * @param {string} opts.model - Model to use (only for API mode)
 * @returns {Promise<string>} The text response
 */
export async function claudeChat({ system, messages, maxTokens = 4096, model = 'claude-sonnet-4-20250514' }) {
  if (USE_CLI) {
    return claudeViaCLI({ system, messages, maxTokens });
  }
  return claudeViaAPI({ system, messages, maxTokens, model });
}

async function claudeViaAPI({ system, messages, maxTokens, model }) {
  const client = getApiClient();
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: system || undefined,
    messages,
  });
  return response.content[0].text.trim();
}

async function claudeViaCLI({ system, messages, maxTokens }) {
  // Build a single prompt from system + messages
  const parts = [];
  if (system) {
    parts.push(`<system>\n${system}\n</system>\n`);
  }
  for (const msg of messages) {
    if (msg.role === 'user') {
      parts.push(msg.content);
    } else if (msg.role === 'assistant') {
      parts.push(`[Tu respuesta anterior]: ${msg.content}`);
    }
  }

  const fullPrompt = parts.join('\n\n');

  return new Promise((resolve, reject) => {
    const proc = execFile('claude', ['-p', fullPrompt, '--output-format', 'text'], {
      maxBuffer: 1024 * 1024 * 5, // 5MB for large HTML responses
      timeout: 120_000, // 2 min timeout
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Claude CLI error: ${error.message}\n${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export function getMode() {
  return USE_CLI ? 'cli' : 'api';
}
