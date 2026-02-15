import archiver from 'archiver';

function generateWordPressXML(articles, projectName) {
  const now = new Date().toUTCString();
  const items = articles
    .map((a) => {
      const pubDate = new Date(a.created_at).toUTCString();
      const escapedContent = `<![CDATA[${a.content || ''}]]>`;
      const escapedTitle = `<![CDATA[${a.title || a.keyword}]]>`;
      return `
    <item>
      <title>${escapedTitle}</title>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <content:encoded>${escapedContent}</content:encoded>
      <wp:post_date><![CDATA[${a.created_at}]]></wp:post_date>
      <wp:post_type><![CDATA[post]]></wp:post_type>
      <wp:status><![CDATA[draft]]></wp:status>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/"
>
<channel>
  <title>${projectName}</title>
  <link>https://example.com</link>
  <description>Exported from ArticleWriterPro</description>
  <pubDate>${now}</pubDate>
  <language>en</language>
  <wp:wxr_version>1.2</wp:wxr_version>
  ${items}
</channel>
</rss>`;
}

function createHTMLZip(articles, template, res) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  articles.forEach((article, i) => {
    const html = template
      .replace(/{{title}}/g, article.title || article.keyword)
      .replace(/{{content}}/g, article.content || '')
      .replace(/{{keyword}}/g, article.keyword)
      .replace(/{{date}}/g, new Date(article.created_at).toLocaleDateString())
      .replace(/{{author}}/g, 'ArticleWriterPro');

    const slug = (article.title || article.keyword)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    archive.append(html, { name: `${String(i + 1).padStart(3, '0')}-${slug}.html` });
  });

  archive.finalize();
}

function createMarkdownZip(articles, res) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  articles.forEach((article, i) => {
    // Convert simple HTML to markdown-ish
    let md = `# ${article.title || article.keyword}\n\n`;
    md += `**Keyword:** ${article.keyword}\n`;
    md += `**Date:** ${new Date(article.created_at).toLocaleDateString()}\n\n`;
    md += `---\n\n`;

    let content = article.content || '';
    content = content
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    md += content;

    const slug = (article.title || article.keyword)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    archive.append(md, { name: `${String(i + 1).padStart(3, '0')}-${slug}.md` });
  });

  archive.finalize();
}

export { generateWordPressXML, createHTMLZip, createMarkdownZip };
