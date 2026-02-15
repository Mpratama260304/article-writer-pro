import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ArticleViewer() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then((data) => { setArticle(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!article) return <div className="text-center py-20 text-secondary">Article not found</div>;

  return (
    <div>
      <Link
        to={`/projects/${article.project_id}`}
        className="inline-flex items-center gap-1 text-secondary hover:text-white mb-4 text-sm"
      >
        ← Back to Project
      </Link>

      <div className="card p-6 lg:p-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-3">{article.title || article.keyword}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-secondary mb-6 pb-6 border-b border-gray-800">
          <span>Keyword: <strong className="text-white">{article.keyword}</strong></span>
          <span>Language: {article.language}</span>
          <span>Tone: {article.tone}</span>
          <span>Words: {article.word_count}</span>
          <span>{new Date(article.created_at).toLocaleDateString()}</span>
        </div>

        <div
          className="prose prose-invert max-w-none
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-white
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-white
            [&_p]:mb-4 [&_p]:text-gray-300 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
            [&_li]:mb-1 [&_li]:text-gray-300
            [&_strong]:text-white [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>
    </div>
  );
}
