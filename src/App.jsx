import React, { useState } from 'react';
import {
  Search, Youtube, AlertTriangle, CheckSquare, Square,
  Loader2, Download, Copy, FileText, Check, ChevronRight, FileDown, Key,
  Filter, Zap, GitMerge, RotateCcw, Link, ClipboardList
} from 'lucide-react';

// --- Utility Functions ---
const parseDuration = (durationStr) => {
  if (!durationStr) return "0:00";
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const h = parseInt(match[1]) || 0;
  const m = parseInt(match[2]) || 0;
  const s = parseInt(match[3]) || 0;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const durationToSeconds = (durationStr) => {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1]) || 0;
  const m = parseInt(match[2]) || 0;
  const s = parseInt(match[3]) || 0;
  return h * 3600 + m * 60 + s;
};

const formatViews = (views) => {
  try {
    const v = parseInt(views);
    if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v/1000).toFixed(1)}K`;
    return v.toString();
  } catch {
    return "0";
  }
};

// Smart Keyword Extractive Summarization
const generateTLDR = (text, numSentences = 5) => {
  if (!text || text.length < 50) return ["No meaningful text available."];
  
  const sentences = text.match(/[^.!?]+[.!?]+/g) || text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  if (!sentences || sentences.length === 0) return ["Text format unsupported for summarization."];

  const validSentences = sentences.map(s => s.trim()).filter(s => s.length > 20);
  if (validSentences.length <= numSentences) return validSentences;

  const stopWords = new Set(['the', 'is', 'in', 'and', 'to', 'a', 'of', 'for', 'it', 'with', 'as', 'you', 'that', 'this', 'on', 'be', 'are', 'i', 'we', 'they', 'what', 'so', 'but', 'not', 'have', 'like', 'just', 'can', 'about', 'your', 'if', 'or']);
  
  const wordFreq = {};
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  let maxFreq = 0;
  
  words.forEach(w => {
    if (!stopWords.has(w) && w.length > 2) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
      if (wordFreq[w] > maxFreq) maxFreq = wordFreq[w];
    }
  });

  for (const w in wordFreq) {
    wordFreq[w] = wordFreq[w] / maxFreq;
  }

  const scoredSentences = validSentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    let score = 0;
    sentenceWords.forEach(w => {
      if (wordFreq[w]) score += wordFreq[w];
    });
    score = score / (sentenceWords.length || 1); 
    return { text: sentence, score, index };
  });

  scoredSentences.sort((a, b) => b.score - a.score);
  const topSentences = scoredSentences.slice(0, numSentences).sort((a, b) => a.index - b.index);

  return topSentences.map(s => s.text);
};

const extractText = (obj) => {
  if (!obj) return "";
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(o => extractText(o)).join(' ');
  if (typeof obj === 'object') {
    if (obj.text) return obj.text + ' ' + extractText(obj.children || []);
    return Object.values(obj).map(v => extractText(v)).join(' ');
  }
  return "";
};

// --- YouTube URL Parsing ---
const parseVideoIds = (text) => {
  const lines = text.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
  const ids = new Set();
  for (const line of lines) {
    // youtube.com/watch?v=ID
    let match = line.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) { ids.add(match[1]); continue; }
    // youtu.be/ID
    match = line.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) { ids.add(match[1]); continue; }
    // youtube.com/embed/ID or youtube.com/v/ID
    match = line.match(/youtube\.com\/(?:embed|v)\/([a-zA-Z0-9_-]{11})/);
    if (match) { ids.add(match[1]); continue; }
    // youtube.com/shorts/ID
    match = line.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match) { ids.add(match[1]); continue; }
    // bare 11-char video ID
    match = line.match(/^([a-zA-Z0-9_-]{11})$/);
    if (match) { ids.add(match[1]); continue; }
  }
  return [...ids];
};

// --- oEmbed metadata (no API key needed) ---
const fetchOembedMeta = async (videoId) => {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      video_id: videoId,
      title: data.title || videoId,
      channel: data.author_name || 'Unknown',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      view_count: '—',
      duration: '—',
      durationSeconds: 0
    };
  } catch {
    return {
      video_id: videoId,
      title: videoId,
      channel: 'Unknown',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      view_count: '—',
      duration: '—',
      durationSeconds: 0
    };
  }
};

// --- Consensus Matrix ---
const MATRIX_STOP_WORDS = new Set([
  'the','is','in','and','to','a','of','for','it','with','as','you','that','this','on',
  'be','are','i','we','they','what','so','but','not','have','like','just','can','about',
  'your','if','or','at','by','from','was','were','been','has','had','do','did','will',
  'would','could','should','all','more','when','there','an','some','my','their','its',
  'our','one','two','also','get','got','know','think','make','go','going','want','see',
  'come','how','very','really','which','up','out','into','who','him','her','them',
  'then','than','because','even','through','these','those','me','he','she','am',
  'let','now','no','yes','say','said','says','actually','basically','literally','right',
  'well','okay','kind','thing','things','way','ways','time','times','little','big','lot',
  'dont','cant','wont','isnt','wasnt','didnt','hasnt','havent','shouldnt','wouldnt'
]);

const buildConsensusMatrix = (processedVideos) => {
  const successVideos = processedVideos.filter(v => v.status === 'success' && v.transcript);
  if (successVideos.length < 2) return [];

  const videoWordMaps = successVideos.map(v => {
    const words = v.transcript.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const freq = {};
    words.forEach(w => {
      if (w.length > 3 && !MATRIX_STOP_WORDS.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });
    return freq;
  });

  const globalFreq = {};
  const globalVideoCount = {};

  videoWordMaps.forEach(freq => {
    const wordsInVideo = new Set(Object.keys(freq));
    wordsInVideo.forEach(w => { globalVideoCount[w] = (globalVideoCount[w] || 0) + 1; });
    Object.entries(freq).forEach(([w, count]) => { globalFreq[w] = (globalFreq[w] || 0) + count; });
  });

  return Object.entries(globalVideoCount)
    .filter(([, videoCount]) => videoCount >= 2)
    .map(([word, videoCount]) => ({ word, videoCount, totalCount: globalFreq[word] }))
    .sort((a, b) => b.videoCount - a.videoCount || b.totalCount - a.totalCount)
    .slice(0, 60);
};

// --- Golden Nugget Extractor ---
const HIGH_SIGNAL_TRIGGERS = [
  'the most important','the biggest mistake','the key is','the key to',
  'the secret is','the secret to','what most people',"most people don't",
  'you should never','you should always','the number one','always remember',
  'never forget','the real reason','the truth about','what nobody tells',
  'the best way to','the single most','the main reason','the fundamental',
  'you must','critical mistake','the problem is','the solution is',
  'the difference between','the reason why','the one thing','above all else',
  'rule number','golden rule','pro tip','this is crucial','this is critical',
  'never do this','if you remember nothing','whatever you do',
];

const extractGoldenNuggets = (processedVideos) => {
  const nuggets = [];
  const loweredTriggers = HIGH_SIGNAL_TRIGGERS.map(t => t.toLowerCase());

  processedVideos.forEach(v => {
    if (v.status !== 'success' || !v.transcript) return;
    const sentences = v.transcript.split(/(?<=[.!?])\s+/);
    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      const matchedTrigger = loweredTriggers.find(t => lower.includes(t));
      if (matchedTrigger && sentence.trim().length > 40 && sentence.trim().length < 600) {
        nuggets.push({ quote: sentence.trim(), source: v.title, channel: v.channel, trigger: matchedTrigger, url: v.url });
      }
    });
  });

  return nuggets
    .filter((n, i, arr) => arr.findIndex(m => m.quote.slice(0, 60) === n.quote.slice(0, 60)) === i)
    .slice(0, 60);
};

// --- Main Application Component ---
export default function App() {
  const envKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  const [apiKey, setApiKey] = useState(envKey || localStorage.getItem('courseforge_youtube_key') || '');
  const hasApiKey = !!(envKey || localStorage.getItem('courseforge_youtube_key'));
  const [step, setStep] = useState(1);
  
  const [topic, setTopic] = useState('');
  const [maxResults, setMaxResults] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Input mode: 'search', 'urls' (YouTube link import), or 'paste' (no API key needed)
  const [inputMode, setInputMode] = useState('paste');
  const [urlInput, setUrlInput] = useState('');

  // Advanced Filters
  const [excludeShorts, setExcludeShorts] = useState(true);
  const [excludePodcasts, setExcludePodcasts] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);

  // Quota Tracker — starts at 1,000, persisted to localStorage
  const [quota, setQuota] = useState(() => {
    const stored = localStorage.getItem('courseforge_quota');
    return stored !== null ? parseInt(stored, 10) : 1000;
  });

  const deductQuota = () => {
    setQuota(prev => {
      const next = prev - 1;
      localStorage.setItem('courseforge_quota', next.toString());
      return next;
    });
  };

  const resetQuota = () => {
    localStorage.setItem('courseforge_quota', '1000');
    setQuota(1000);
  };

  const [videos, setVideos] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);

  const [compiledData, setCompiledData] = useState({ document: '', wordCount: 0 });
  const [copied, setCopied] = useState(false);

  // Step 4 result tabs
  const [activeTab, setActiveTab] = useState('document');
  const [consensusTopics, setConsensusTopics] = useState([]);
  const [goldenNuggets, setGoldenNuggets] = useState([]);

  // --- Navigation Helpers ---
  const resetToSearch = () => {
    if (step === 0 || step === 3) return;
    setStep(1);
    setTopic('');
    setUrlInput('');
    setInputMode('paste');
    setVideos([]);
    setSelectedIds(new Set());
    setCompiledData({ document: '', wordCount: 0 });
    setConsensusTopics([]);
    setGoldenNuggets([]);
    setActiveTab('document');
    setError(null);
  };

  const goBackToSearch = () => {
    // Goes back to search but keeps the topic so the user doesn't have to retype it
    setStep(1);
    setVideos([]);
    setError(null);
  };

  // --- API Handlers ---
  const handleSetup = (e) => {
    e.preventDefault();
    if (apiKey.trim().length > 10) {
      localStorage.setItem('courseforge_youtube_key', apiKey.trim());
      setStep(1);
    } else {
      setError("Please enter a valid YouTube Data API v3 key.");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      // Build search URL — apply publishedAfter for "Last 2 Years" filter
      let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(topic)}&type=video&order=viewCount&relevanceLanguage=en&key=${apiKey}`;

      if (recentOnly) {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        searchUrl += `&publishedAfter=${twoYearsAgo.toISOString()}`;
      }

      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();

      if (!searchRes.ok) throw new Error(searchData.error?.message || "YouTube API Error");
      if (!searchData.items || searchData.items.length === 0) throw new Error("No videos found for this topic.");

      const videoIds = searchData.items.map(item => item.id.videoId).join(',');
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
      const statsRes = await fetch(statsUrl);
      const statsData = await statsRes.json();

      if (!statsRes.ok) throw new Error(statsData.error?.message || "YouTube API Stats Error");

      let results = searchData.items.map((item, index) => {
        const statItem = statsData.items[index];
        const rawDuration = statItem?.contentDetails?.duration || '';
        const seconds = durationToSeconds(rawDuration);
        return {
          video_id: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          view_count: formatViews(statItem?.statistics?.viewCount || 0),
          duration: parseDuration(rawDuration),
          durationSeconds: seconds
        };
      });

      // Post-fetch duration filtering
      if (excludeShorts)   results = results.filter(v => v.durationSeconds >= 180);   // ≥ 3 min
      if (excludePodcasts) results = results.filter(v => v.durationSeconds <= 3600);  // ≤ 1 hr

      if (results.length === 0)
        throw new Error("No videos matched your filters. Try relaxing the duration filters.");

      setVideos(results);
      setSelectedIds(new Set(results.map(v => v.video_id)));
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to search YouTube.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlImport = async (e) => {
    e.preventDefault();
    const videoIds = parseVideoIds(urlInput);
    if (videoIds.length === 0) {
      setError("No valid YouTube video IDs found. Paste YouTube URLs (one per line).");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Fetch snippet + stats in one call (up to 50 IDs per request)
      const idsParam = videoIds.join(',');
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${idsParam}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || "YouTube API Error");
      if (!data.items || data.items.length === 0) throw new Error("None of the provided video IDs returned results.");

      const results = data.items.map(item => {
        const rawDuration = item.contentDetails?.duration || '';
        const seconds = durationToSeconds(rawDuration);
        return {
          video_id: item.id,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          url: `https://www.youtube.com/watch?v=${item.id}`,
          view_count: formatViews(item.statistics?.viewCount || 0),
          duration: parseDuration(rawDuration),
          durationSeconds: seconds
        };
      });

      if (results.length === 0) throw new Error("No valid videos found from the provided links.");

      // Auto-set topic from the collection for the master document header
      if (!topic.trim()) {
        setTopic(`YouTube Import (${results.length} video${results.length !== 1 ? 's' : ''})`);
      }

      setVideos(results);
      setSelectedIds(new Set(results.map(v => v.video_id)));
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to fetch video details.");
    } finally {
      setIsLoading(false);
    }
  };

  // Free YouTube search via Invidious (no API key needed)
  const INVIDIOUS_INSTANCES = [
    'https://vid.puffyan.us',
    'https://invidious.fdn.fr',
    'https://y.com.sb',
    'https://invidious.nerdvpn.de',
  ];

  const handleFreeSearch = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);

    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(topic)}&type=video&sort_by=relevance`;
        const res = await fetch(searchUrl);
        if (!res.ok) continue;
        const data = await res.json();

        if (!data || data.length === 0) continue;

        const results = data.slice(0, parseInt(maxResults)).map(item => ({
          video_id: item.videoId,
          title: item.title,
          channel: item.author || 'Unknown',
          thumbnail: item.videoThumbnails?.find(t => t.quality === 'high')?.url
            || item.videoThumbnails?.[0]?.url
            || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${item.videoId}`,
          view_count: formatViews(item.viewCount || 0),
          duration: item.lengthSeconds > 0
            ? (item.lengthSeconds >= 3600
              ? `${Math.floor(item.lengthSeconds/3600)}:${String(Math.floor((item.lengthSeconds%3600)/60)).padStart(2,'0')}:${String(item.lengthSeconds%60).padStart(2,'0')}`
              : `${Math.floor(item.lengthSeconds/60)}:${String(item.lengthSeconds%60).padStart(2,'0')}`)
            : '—',
          durationSeconds: item.lengthSeconds || 0
        }));

        if (results.length === 0) continue;

        setVideos(results);
        setSelectedIds(new Set(results.map(v => v.video_id)));
        setStep(2);
        setIsLoading(false);
        return;
      } catch {
        continue;
      }
    }

    setError("Could not search YouTube. Please try again in a moment or use the YouTube Links mode.");
    setIsLoading(false);
  };

  const handleGetUrls = () => {
    const selected = videos.filter(v => selectedIds.has(v.video_id));
    if (selected.length === 0) return;
    const urlList = selected.map(v => v.url).join('\n');
    navigator.clipboard.writeText(urlList);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === videos.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(videos.map(v => v.video_id)));
  };

  const handleProcess = async () => {
    if (selectedIds.size === 0) return;
    
    setStep(3);
    setError(null);
    const selectedVideos = videos.filter(v => selectedIds.has(v.video_id));
    let processedVideos = [];
    
    try {
      for (let i = 0; i < selectedVideos.length; i++) {
        const v = selectedVideos[i];
        setProgressMsg(`Extracting transcript for: ${v.title.substring(0, 40)}...`);
        setProgressPct(Math.round((i / selectedVideos.length) * 100));
        
        let transcriptText = "";
        let status = "success";

        try {
          const targetUrl = "https://www.youtube-transcript.io/api/transcripts";
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

          const res = await fetch(proxyUrl, {
            method: "POST",
            headers: {
              "Authorization": "Basic 69a8f21ad48c56bf351bffa5", 
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ ids: [v.video_id] })
          });
          
          if (!res.ok) throw new Error("Failed to fetch transcript");
          
          const data = await res.json();
          transcriptText = extractText(data).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

          if (!transcriptText || transcriptText.length < 50) {
            status = "unavailable";
            transcriptText = "";
          } else {
            // Deduct 1 quota credit per successful transcript pull
            deductQuota();
          }
        } catch (err) {
          console.error("Transcript error:", err);
          status = "unavailable";
        }
        
        processedVideos.push({
          ...v,
          transcript: transcriptText,
          summary: status === "success" ? generateTLDR(transcriptText) : ["Transcript unavailable for this video."],
          status: status
        });
      }
      
      setProgressPct(100);
      setProgressMsg("Compiling Master Document...");
      
      const now = new Date().toLocaleString();
      let doc = `=========================================\n`;
      doc += ` COURSEFORGE RESEARCH DOCUMENT\n`;
      doc += `=========================================\n`;
      doc += `TOPIC: ${topic}\n`;
      doc += `GENERATED: ${now}\n`;
      doc += `TOTAL SOURCES: ${processedVideos.length}\n`;
      doc += `=========================================\n\n`;

      processedVideos.forEach((v, i) => {
        doc += `---\n\nSOURCE ${i + 1}: ${v.title}\n`;
        doc += `CHANNEL: ${v.channel}\n`;
        doc += `URL: ${v.url}\n`;
        doc += `VIEWS: ${v.view_count}\n\n`;
        
        doc += `CURATED SUMMARY (Keyword Extracted):\n`;
        v.summary.forEach(bullet => { doc += `- ${bullet}\n`; });

        doc += `\nFULL TRANSCRIPT:\n`;
        if (v.status === "success") {
          doc += `${v.transcript}\n\n`;
        } else {
          doc += `[TRANSCRIPT UNAVAILABLE FOR THIS VIDEO]\n\n`;
        }
      });
      
      setCompiledData({ document: doc, wordCount: doc.split(/\s+/).length });

      // Build Consensus Matrix and extract Golden Nuggets
      setConsensusTopics(buildConsensusMatrix(processedVideos));
      setGoldenNuggets(extractGoldenNuggets(processedVideos));
      setActiveTab('document');
      setStep(4);

    } catch (err) {
      setError(err.message || "An error occurred during processing.");
      setStep(2); 
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledData.document);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format) => {
    const blob = new Blob([compiledData.document], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTopic = (topic || 'research').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `CourseForge_${cleanTopic}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getReadTime = (words) => Math.ceil(words / 238);

  // Tag cloud helpers for Consensus Matrix
  const maxVideoCount = consensusTopics.length > 0 ? Math.max(...consensusTopics.map(t => t.videoCount)) : 1;
  const getTagStyle = (videoCount) => {
    const r = videoCount / maxVideoCount;
    if (r >= 0.9) return { fontSize: '1.5rem', fontWeight: '700' };
    if (r >= 0.65) return { fontSize: '1.2rem', fontWeight: '600' };
    if (r >= 0.4) return { fontSize: '1rem', fontWeight: '500' };
    return { fontSize: '0.82rem', fontWeight: '400' };
  };
  const getTagColor = (videoCount) => {
    const r = videoCount / maxVideoCount;
    if (r >= 0.9) return 'text-amber-400';
    if (r >= 0.65) return 'text-amber-500';
    if (r >= 0.4) return 'text-amber-600';
    return 'text-gray-500';
  };
  const quotaColor = quota > 500 ? 'text-green-400' : quota > 200 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-200 font-sans selection:bg-amber-500/30">
      
      {/* Header with Clickable Logo + Quota Tracker */}
      <header className="border-b border-gray-800 bg-[#141414] px-6 py-4 flex items-center justify-between">
        <div 
          className={`flex items-center gap-3 ${step > 0 && step !== 3 ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={() => { if (step > 0 && step !== 3) resetToSearch(); }}
          title={step > 0 && step !== 3 ? "Start New Research" : ""}
        >
          <div className="bg-amber-500 p-2 rounded-lg"><Youtube className="w-6 h-6 text-black" /></div>
          <h1 className="text-xl font-bold tracking-wide text-white">CourseForge</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Quota Tracker */}
          <div className="flex items-center gap-2 bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-1.5 text-xs">
            <Zap className={`w-3.5 h-3.5 ${quotaColor}`} />
            <span className="text-gray-500">Credits:</span>
            <span className={`font-bold tabular-nums ${quotaColor}`}>{quota.toLocaleString()}</span>
            <button onClick={resetQuota} title="Reset quota to 1,000" className="ml-1 text-gray-600 hover:text-gray-400 transition-colors">
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {!envKey && step !== 0 && step !== 3 && (
            <button onClick={() => setStep(0)} className="text-xs text-gray-500 hover:text-amber-500 transition-colors flex items-center gap-1">
              <Key className="w-3 h-3"/> {apiKey.trim() ? 'Change API Key' : 'Add API Key'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded flex items-center gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {step === 0 && (
          <div className="max-w-xl mx-auto mt-20 animate-fade-in">
            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <Key className="w-8 h-8 text-amber-500" />
                <h2 className="text-2xl font-bold text-white">Setup Credentials</h2>
              </div>
              <p className="text-gray-400 mb-6 text-sm">
                Add your API key below. (Note: You can skip this screen permanently by placing your key in the .env file in VS Code).
              </p>
              <form onSubmit={handleSetup} className="space-y-4">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your YouTube API Key here..."
                  className="w-full bg-[#111] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-3 rounded-lg transition-colors">
                  Save & Continue
                </button>
              </form>
              <button onClick={() => setStep(1)} className="w-full mt-3 text-sm text-gray-500 hover:text-amber-500 transition-colors py-2">
                Skip — I'll use Free Search (no key needed)
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-2xl mx-auto mt-20 animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-4">What do you want to teach?</h2>
            <p className="text-gray-400 mb-8">Search by topic or paste YouTube links to aggregate transcripts and summaries.</p>

            {/* Mode Toggle */}
            <div className="flex gap-1 mb-6 bg-[#1a1a1a] border border-gray-800 rounded-xl p-1 w-fit">
              <button
                onClick={() => setInputMode('paste')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputMode === 'paste' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                <Search className="w-4 h-4" /> Free Search
              </button>
              <button
                onClick={() => { if (!apiKey.trim()) { setError('Search requires a YouTube Data API key. Enter it via "Change API Key" above, or use Paste & Parse instead.'); return; } setInputMode('search'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputMode === 'search' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                <Search className="w-4 h-4" /> Search by Topic
              </button>
              <button
                onClick={() => { if (!apiKey.trim()) { setError('URL Import requires a YouTube Data API key for metadata. Use Paste & Parse instead (no key needed).'); return; } setInputMode('urls'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputMode === 'urls' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                <Link className="w-4 h-4" /> YouTube Links
              </button>
            </div>

            {inputMode === 'paste' ? (
              <form onSubmit={handleFreeSearch} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. 'Advanced Negotiation Tactics'"
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                  <select
                    value={maxResults}
                    onChange={(e) => setMaxResults(e.target.value)}
                    className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="5">Top 5 videos</option>
                    <option value="10">Top 10 videos</option>
                    <option value="20">Top 20 videos</option>
                  </select>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white font-medium py-3 rounded-lg flex justify-center items-center gap-2 transition-colors">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  {isLoading ? 'Searching YouTube...' : 'Search YouTube'}
                </button>
                <p className="text-xs text-gray-600 text-center">No API key needed. Select results then get URLs or extract transcripts.</p>
              </form>
            ) : inputMode === 'search' ? (
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. 'Advanced Negotiation Tactics'"
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                  <select
                    value={maxResults}
                    onChange={(e) => setMaxResults(e.target.value)}
                    className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="5">Top 5 videos</option>
                    <option value="10">Top 10 videos</option>
                    <option value="20">Top 20 videos</option>
                  </select>
                </div>

                {/* Advanced Filters */}
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <Filter className="w-3.5 h-3.5" /> Advanced Filters
                  </div>
                  <div className="flex flex-wrap gap-6">
                    {[
                      { label: 'Exclude Shorts', sub: '<3 min', val: excludeShorts, set: setExcludeShorts },
                      { label: 'Exclude Long Podcasts', sub: '>1 hr', val: excludePodcasts, set: setExcludePodcasts },
                      { label: 'Last 2 Years Only', sub: null, val: recentOnly, set: setRecentOnly },
                    ].map(({ label, sub, val, set }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => set(v => !v)}
                        className="flex items-center gap-2.5 group"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${val ? 'bg-amber-500 border-amber-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                          {val && <Check className="w-2.5 h-2.5 text-black" />}
                        </div>
                        <span className="text-sm text-gray-300 text-left">
                          {label} {sub && <span className="text-gray-600">({sub})</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white font-medium py-3 rounded-lg flex justify-center items-center gap-2 transition-colors">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  {isLoading ? 'Searching YouTube...' : 'Start Research'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleUrlImport} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic label (optional) — e.g. 'Negotiation Tactics'"
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-amber-500 transition-colors mb-4"
                  />
                  <textarea
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={"Paste YouTube links here (one per line):\nhttps://www.youtube.com/watch?v=abc123\nhttps://youtu.be/xyz789\n..."}
                    rows={8}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg py-3 px-4 text-white font-mono text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Supports youtube.com/watch, youtu.be, and embed links. {urlInput.trim() ? `${parseVideoIds(urlInput).length} video(s) detected` : ''}
                  </p>
                </div>

                <button type="submit" disabled={isLoading || parseVideoIds(urlInput).length === 0} className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white font-medium py-3 rounded-lg flex justify-center items-center gap-2 transition-colors">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Link className="w-5 h-5" />}
                  {isLoading ? 'Fetching Video Details...' : `Import ${parseVideoIds(urlInput).length || ''} Video${parseVideoIds(urlInput).length !== 1 ? 's' : ''}`}
                </button>
              </form>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                {/* Back Button added here */}
                <button 
                  onClick={goBackToSearch}
                  className="text-amber-500 hover:text-amber-400 text-sm font-medium mb-2 flex items-center gap-1 transition-colors"
                >
                  ← Back to Search
                </button>
                <h2 className="text-2xl font-bold text-white">Select Sources</h2>
                <p className="text-gray-400 text-sm mt-1">{inputMode === 'urls' ? `Imported ${videos.length} video${videos.length !== 1 ? 's' : ''} from YouTube links` : `Found ${videos.length} videos for "${topic}"`}</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={toggleAll} className="text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                  {selectedIds.size === videos.length ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>} Select All
                </button>
                <button onClick={handleGetUrls} disabled={selectedIds.size === 0} className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors text-sm">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <ClipboardList className="w-4 h-4" />}
                  {copied ? 'Copied!' : `Get URLs (${selectedIds.size})`}
                </button>
                <button onClick={handleProcess} disabled={selectedIds.size === 0} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
                  Extract Transcripts <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map(video => (
                <div key={video.video_id} onClick={() => toggleSelection(video.video_id)} className={`bg-[#1a1a1a] border ${selectedIds.has(video.video_id) ? 'border-amber-500' : 'border-gray-800'} rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition-colors relative group`}>
                  <div className="relative aspect-video">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">{video.duration}</div>
                    <div className="absolute top-2 left-2">{selectedIds.has(video.video_id) ? <div className="bg-amber-500 text-black rounded p-0.5"><Check className="w-4 h-4" /></div> : <div className="bg-black/50 border border-white/50 rounded w-5 h-5 group-hover:bg-black/70" />}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-200 line-clamp-2 text-sm" title={video.title}>{video.title}</h3>
                    <div className="flex justify-between items-center mt-3 text-xs text-gray-500"><span>{video.channel}</span><span>{video.view_count} views</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-xl mx-auto mt-32 text-center animate-fade-in">
            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 shadow-xl">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Extracting Knowledge</h2>
              <p className="text-amber-500 text-sm mb-6 h-5">{progressMsg}</p>
              <div className="w-full bg-gray-800 rounded-full h-3 mb-2 overflow-hidden">
                <div className="bg-amber-500 h-3 rounded-full transition-all duration-300 ease-out" style={{ width: `${progressPct}%` }}></div>
              </div>
              <p className="text-gray-500 text-xs text-right">{progressPct}% Complete</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in">

            {/* Tab Bar */}
            <div className="flex gap-1 mb-4 bg-[#1a1a1a] border border-gray-800 rounded-xl p-1 w-fit">
              {[
                { id: 'document', label: 'Master Document', icon: <FileText className="w-4 h-4" /> },
                { id: 'consensus', label: `Consensus Matrix${consensusTopics.length > 0 ? ` (${consensusTopics.length})` : ''}`, icon: <GitMerge className="w-4 h-4" /> },
                { id: 'nuggets', label: `Golden Nuggets${goldenNuggets.length > 0 ? ` (${goldenNuggets.length})` : ''}`, icon: <Zap className="w-4 h-4" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ---- Tab: Master Document ---- */}
            {activeTab === 'document' && (
              <div className="flex flex-col" style={{ height: 'calc(100vh - 240px)', minHeight: '500px' }}>
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-t-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-800 p-2 rounded-lg"><FileText className="w-5 h-5 text-amber-500" /></div>
                    <div><h2 className="font-bold text-white text-lg leading-tight">Master Document Ready</h2><p className="text-xs text-gray-400">{compiledData.wordCount.toLocaleString()} words • ~{getReadTime(compiledData.wordCount)} min read</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
                      {copied ? <Check className="w-4 h-4 text-green-400"/> : <Copy className="w-4 h-4"/>} {copied ? 'Copied!' : 'Copy All'}
                    </button>
                    <button onClick={() => handleDownload('md')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"><FileDown className="w-4 h-4"/>Markdown</button>
                    <button onClick={() => handleDownload('txt')} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"><Download className="w-4 h-4"/>Text File</button>
                  </div>
                </div>
                <div className="bg-[#111] border border-gray-800 border-t-0 rounded-b-xl flex-1 overflow-hidden">
                  <textarea readOnly value={compiledData.document} className="w-full h-full p-6 bg-transparent text-gray-300 font-mono text-sm leading-relaxed resize-none focus:outline-none custom-scrollbar" spellCheck="false" />
                </div>
              </div>
            )}

            {/* ---- Tab: Consensus Matrix ---- */}
            {activeTab === 'consensus' && (
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <GitMerge className="w-6 h-6 text-amber-500" />
                  <h2 className="text-xl font-bold text-white">Consensus Matrix</h2>
                </div>
                <p className="text-gray-500 text-sm mb-6">
                  Topics mathematically cross-referenced across all transcripts. Larger &amp; brighter = appears in more videos.
                </p>

                {consensusTopics.length === 0 ? (
                  <div className="text-center py-16 text-gray-600">
                    <GitMerge className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Not enough transcripts to build a consensus matrix.<br />At least 2 successful transcripts are required.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-x-5 gap-y-3 leading-loose mb-8 p-4 bg-[#111] rounded-xl border border-gray-800">
                      {consensusTopics.map(({ word, videoCount, totalCount }) => (
                        <span
                          key={word}
                          title={`In ${videoCount} video${videoCount !== 1 ? 's' : ''} · ${totalCount} total mentions`}
                          className={`cursor-default hover:opacity-75 transition-opacity ${getTagColor(videoCount)}`}
                          style={getTagStyle(videoCount)}
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-600 pt-2">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Core Theme (all/most videos)</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-600 inline-block" /> Common Theme</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-500 inline-block" /> Recurring Term (2+ videos)</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ---- Tab: Golden Nuggets ---- */}
            {activeTab === 'nuggets' && (
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-6 h-6 text-amber-500" />
                  <h2 className="text-xl font-bold text-white">Golden Nuggets</h2>
                </div>
                <p className="text-gray-500 text-sm mb-6">
                  High-signal declarative statements extracted across all transcripts — the most quotable, actionable insights.
                </p>

                {goldenNuggets.length === 0 ? (
                  <div className="text-center py-16 text-gray-600">
                    <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No high-signal statements detected in these transcripts.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {goldenNuggets.map((nugget, i) => (
                      <div key={i} className="bg-[#111] border border-gray-800 rounded-xl p-5 hover:border-amber-500/30 transition-colors">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-500 text-xl shrink-0 leading-none mt-0.5">"</span>
                          <p className="text-gray-200 text-sm leading-relaxed flex-1">{nugget.quote}</p>
                          <span className="text-amber-500 text-xl shrink-0 leading-none mt-0.5">"</span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                          <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                            <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono shrink-0">
                              {nugget.trigger}
                            </span>
                            <span className="hidden sm:inline">·</span>
                            <span className="truncate hidden sm:block">{nugget.channel}</span>
                          </div>
                          <a href={nugget.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-amber-500 transition-colors shrink-0 ml-3">
                            View Source →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 text-center">
              <button onClick={resetToSearch} className="text-gray-500 hover:text-white text-sm transition-colors">← Start New Research</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}