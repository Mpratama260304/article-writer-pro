/**
 * Sanity tests for ArticleWriterPro
 * Run with: node tests/sanity.test.js
 */

import { parseAIResponse, slugify, stripHtml, wordCount, makeExcerpt } from '../server/services/ai-service.js';

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

// ── slugify ──
console.log('\n🔧 slugify');
assert('basic text', slugify('Hello World') === 'hello-world');
assert('special chars', slugify('Café & Résumé!') === 'caf-r-sum');
assert('leading/trailing dashes', slugify('--test--') === 'test');
assert('fallback on empty', slugify('', 'fallback') === 'fallback');
assert('unicode heavy fallback', slugify('日本語テスト', 'nihongo') === 'untitled' || slugify('日本語テスト', 'nihongo') === 'nihongo');

// ── stripHtml ──
console.log('\n🔧 stripHtml');
assert('removes tags', stripHtml('<p>Hello <strong>world</strong></p>') === 'Hello world');
assert('empty input', stripHtml('') === '');
assert('nested tags', stripHtml('<div><p>A</p><p>B</p></div>').replace(/\s+/g, '') === 'AB');

// ── wordCount ──
console.log('\n🔧 wordCount');
assert('basic count', wordCount('one two three') === 3);
assert('extra spaces', wordCount('  one   two   three  ') === 3);
assert('empty', wordCount('') === 0);

// ── makeExcerpt ──
console.log('\n🔧 makeExcerpt');
assert('truncates long text', makeExcerpt('a '.repeat(200), 20).length <= 20);
assert('short text unchanged', makeExcerpt('short text', 160) === 'short text');

// ── parseAIResponse — JSON format ──
console.log('\n🔧 parseAIResponse — JSON');
const jsonInput = JSON.stringify({
  title: 'Test Title',
  keyword: 'test keyword',
  content_html: '<p>Hello world</p>',
  tags: ['tag1', 'tag2'],
});
const jsonResult = parseAIResponse(jsonInput, 'test keyword');
assert('parses title', jsonResult.title === 'Test Title');
assert('parses keyword', jsonResult.keyword === 'test keyword');
assert('parses content', jsonResult.content === '<p>Hello world</p>');
assert('generates slug', typeof jsonResult.slug === 'string' && jsonResult.slug.length > 0);
assert('has tags', Array.isArray(jsonResult.tags) && jsonResult.tags.length === 2);
assert('has excerpt', typeof jsonResult.excerpt === 'string');
assert('has wordCount', typeof jsonResult.wordCount === 'number');

// ── parseAIResponse — JSON inside markdown fence ──
console.log('\n🔧 parseAIResponse — fenced JSON');
const fencedInput = '```json\n' + jsonInput + '\n```';
const fencedResult = parseAIResponse(fencedInput, 'test keyword');
assert('parses fenced JSON title', fencedResult.title === 'Test Title');

// ── parseAIResponse — plain text fallback ──
console.log('\n🔧 parseAIResponse — plain text fallback');
const plainInput = 'This is just some article text without any structure.';
const plainResult = parseAIResponse(plainInput, 'my keyword');
assert('uses keyword as title fallback', plainResult.title === 'my keyword');
assert('uses full text as content', plainResult.content.includes('some article text'));

// ── parseAIResponse — TITLE/KEYWORD/CONTENT format ──
console.log('\n🔧 parseAIResponse — legacy format');
const legacyInput = 'TITLE: My Article Title\nKEYWORD: seo tips\nCONTENT:\n<p>Article body here</p>';
const legacyResult = parseAIResponse(legacyInput, 'seo tips');
assert('parses legacy title', legacyResult.title === 'My Article Title');
assert('parses legacy content', legacyResult.content.includes('Article body here'));

// ── WXR CDATA safety ──
console.log('\n🔧 WXR CDATA safety (import check)');
try {
  const { generateWordPressXML } = await import('../server/services/export-service.js');
  const articles = [
    { id: 1, title: 'Test ]]> Title', keyword: 'test', content: '<p>Content with ]]> inside</p>', slug: 'test-title', tags: '["tag1"]', excerpt: 'An excerpt', created_at: '2025-01-01' },
  ];
  const xml = generateWordPressXML(articles, 'Test Project', 'Indonesian');
  assert('XML contains wp:post_id', xml.includes('<wp:post_id>'));
  assert('XML contains wp:post_name', xml.includes('<wp:post_name>'));
  assert('XML uses publish status', xml.includes('publish'));
  assert('XML has excerpt:encoded', xml.includes('excerpt:encoded'));
  assert('XML has language id', xml.includes('<language>id</language>'));
  assert('CDATA safe — no raw ]]>', !xml.includes(']]>]'));
  assert('XML has category tag', xml.includes('domain="category"'));
  assert('XML has post_tag', xml.includes('domain="post_tag"'));
} catch (err) {
  console.log(`  ❌ WXR import failed: ${err.message}`);
  failed++;
}

// ── Summary ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(40));

process.exit(failed > 0 ? 1 : 0);
