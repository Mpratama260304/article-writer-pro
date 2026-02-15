const DEFAULT_CONFIG = {
  apiBaseUrl: 'https://ark.ap-southeast.bytepluses.com/api/v3',
  apiKey: 'd88c479d-a74d-4040-91df-207bcd94b4a4',
  model: 'glm-4-7-251222',
  maxTokens: 4096,
  temperature: 0.7,
};

function buildPrompt(template, keyword, language, tone, length) {
  const lengthMap = { short: '500', medium: '1000', long: '2000' };
  const wordCount = lengthMap[length] || '1000';
  return template
    .replace(/{keyword}/g, keyword)
    .replace(/{language}/g, language)
    .replace(/{tone}/g, tone)
    .replace(/{length}/g, wordCount);
}

function parseAIResponse(text) {
  let title = '';
  let keyword = '';
  let content = '';

  // Try to parse structured response
  const titleMatch = text.match(/TITLE:\s*(.+)/i);
  const keywordMatch = text.match(/KEYWORD:\s*(.+)/i);
  const contentMatch = text.match(/CONTENT:\s*([\s\S]+)/i);

  if (titleMatch) title = titleMatch[1].trim();
  if (keywordMatch) keyword = keywordMatch[1].trim();
  if (contentMatch) content = contentMatch[1].trim();

  // Fallback: if no structured format, use the whole text as content
  if (!content) {
    content = text;
    // Try to extract a title from the first line or first heading
    const h1Match = text.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const firstLineMatch = text.match(/^#\s+(.+)/m);
    if (h1Match) title = h1Match[1].trim();
    else if (firstLineMatch) title = firstLineMatch[1].trim();
  }

  // Count words
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;

  return { title, keyword, content, wordCount };
}

async function generateArticle(keyword, promptTemplate, language, tone, length, config = {}) {
  const settings = { ...DEFAULT_CONFIG, ...config };

  const prompt = buildPrompt(promptTemplate, keyword, language, tone, length);

  const response = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional SEO content writer. You write comprehensive, engaging, and well-structured articles optimized for search engines.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0]) {
    throw new Error('Invalid API response: no choices returned');
  }

  const rawContent = data.choices[0].message.content;
  return parseAIResponse(rawContent);
}

async function testConnection(config = {}) {
  const settings = { ...DEFAULT_CONFIG, ...config };
  const response = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [{ role: 'user', content: 'Hello, respond with "Connection successful!"' }],
      max_tokens: 50,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export { generateArticle, testConnection, DEFAULT_CONFIG, buildPrompt, parseAIResponse };
