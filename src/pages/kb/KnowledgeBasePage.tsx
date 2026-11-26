import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Search, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface KbArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

const DEFAULT_FAQS: KbArticle[] = [
  {
    id: 'faq-1',
    title: 'How to connect to D. Y. Patil Campus Wi-Fi (Student & Faculty)',
    content:
      '1. Select SSID "DYP-Campus-5G".\n2. Enter your PRN / Employee ID as Username and portal password.\n3. If certificate prompt appears, select "Trust" or "Do not validate".\n4. If login still fails after password reset, raise an IT & Technical Support → Wi-Fi ticket.',
    tags: ['IT', 'Wi-Fi', 'Network'],
  },
  {
    id: 'faq-2',
    title: 'Bonafide Certificate & Fee Structure Letter Procedure',
    content:
      '1. Ensure current semester tuition fees are cleared.\n2. Raise a ticket under Administration → Bonafide Certificate with your PRN and Purpose.\n3. Once approved by the Department HOD, collect the signed copy from the Admin Counter within 2 working days.',
    tags: ['Administration', 'Bonafide', 'Students'],
  },
  {
    id: 'faq-3',
    title: 'Hall Ticket Not Visible / Exam Form Correction Steps',
    content:
      'Hall tickets are released 5 days prior to university theory exams. If your Hall Ticket shows "Pending" despite fee payment, raise a Critical ticket under Examination → Hall Ticket with your UTR payment receipt attached.',
    tags: ['Examination', 'Hall Ticket'],
  },
];

export const KnowledgeBasePage: React.FC = () => {
  const { roleMeta } = useAuth();
  const navigate = useNavigate();

  const [articles, setArticles] = useState<KbArticle[]>(DEFAULT_FAQS);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');

  const loadArticles = async () => {
    const { data } = await supabase
      .from('kb_articles')
      .select('id, title, content, tags')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setArticles([...(data as KbArticle[]), ...DEFAULT_FAQS]);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await supabase.from('kb_articles').insert({
      title: title.trim(),
      content: content.trim(),
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setTitle('');
    setContent('');
    setTagsText('');
    setShowAdd(false);
    loadArticles();
  };

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      a.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-600" />
            <span>Knowledge Base & Campus FAQs</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Instant self-service guides before raising a support ticket
          </p>
        </div>

        {roleMeta.canAddInternalNotes && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Publish Guide
          </button>
        )}
      </div>

      {showAdd && (
        <form
          onSubmit={handlePublish}
          className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm space-y-4"
        >
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article Title (e.g. How to reset university email password)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <textarea
            rows={4}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Step-by-step instructions..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <div className="flex gap-3">
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Tags (comma-separated, e.g. IT, Email, Faculty)"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold cursor-pointer"
            >
              Publish
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Wi-Fi, Bonafide, Hall Ticket, Fees, Hostel..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200/80 shadow-apple-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {/* Articles List */}
      <div className="space-y-4">
        {filtered.map((art) => (
          <div
            key={art.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm space-y-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              {art.tags?.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 text-[11px] font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="text-base font-bold text-slate-900">{art.title}</h3>
            <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
              {art.content}
            </p>
          </div>
        ))}
      </div>

      {/* Escalate to Ticket CTA */}
      <div className="bg-brand-50/70 border border-brand-200/80 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-brand-600 shrink-0" />
          <div>
            <div className="text-sm font-bold text-slate-900">Didn't solve your issue?</div>
            <div className="text-xs text-slate-600">
              Raise a tracked support ticket directly with the concerned department.
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/tickets/new')}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 cursor-pointer shrink-0"
        >
          <span>Raise a Ticket</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};