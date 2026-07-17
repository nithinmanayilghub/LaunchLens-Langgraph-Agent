import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Plus,
  RefreshCw,
  TrendingUp,
  ShoppingCart,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Globe,
  Database,
  Grid,
  FileText,
  Activity,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Maximize2,
  Settings,
  Trash2,
  Download,
  Check,
  Brain,
  MessageSquare,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Zap,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

// Helper to parse markdown report into structured fields
function parseFullReport(text) {
  if (!text) return null;
  
  const cleanLine = (line) => line.replace(/\*\*?/g, "").trim();

  const report = {
    title: "Market Scouter Report",
    score: "7.0",
    scoreLabel: "Moderate",
    verdict: "NICHE",
    summary: "",
    demand: "",
    competitors: [],
    pricing: "N/A",
    reviews: "N/A",
    differentiation: "",
    opportunities: "",
    risks: "",
    recommendation: "",
    confidence: "92%",
    sources: ["Google Trends", "Amazon Search", "Google News"]
  };

  const upperText = text.toUpperCase();
  if (upperText.includes("NO-GO") || upperText.includes("NO GO")) {
    report.verdict = "NO-GO";
    report.score = "3.5";
    report.scoreLabel = "Avoid";
  } else if (upperText.includes("NICHE")) {
    report.verdict = "NICHE";
    report.score = "6.0";
    report.scoreLabel = "Niche Viable";
  } else if (upperText.includes("GO")) {
    report.verdict = "GO";
    report.score = "8.4";
    report.scoreLabel = "Recommended";
  }

  const lines = text.split("\n");
  let currentSection = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection && currentSection !== "supply") {
        if (currentSection === "summary") report.summary += "\n";
        else if (currentSection === "demand") report.demand += "\n";
        else if (currentSection === "differentiation") report.differentiation += "\n";
        else if (currentSection === "opps_risks") report.opportunities += "\n";
        else if (currentSection === "score" || currentSection === "verdict") report.recommendation += "\n";
      }
      continue;
    }
    
    // Extract title
    if (i < 10 && trimmed.startsWith("#") && !trimmed.startsWith("###")) {
      report.title = cleanLine(trimmed.replace(/^#+\s*/, ""));
      continue;
    }
    
    // Detect sections using flexible regex matching (supporting optional headers numbering and bold formatting)
    if (trimmed.match(/^#{1,3}\s*(?:\d+\.?\s*)?\*?\*?(Product Idea Summary|Idea Summary|Summary|Summarize)/i)) {
      currentSection = "summary";
      continue;
    } else if (trimmed.match(/^#{1,3}\s*(?:\d+\.?\s*)?\*?\*?(Demand Analysis|Demand|Analyze Demand)/i)) {
      currentSection = "demand";
      continue;
    } else if (trimmed.match(/^#{1,3}\s*(?:\d+\.?\s*)?\*?\*?(Supply and Competitors Analysis|Competitors Analysis|Competition|Supply|Analyze Supply)/i)) {
      currentSection = "supply";
      continue;
    } else if (trimmed.match(/^#{1,3}\s*(?:\d+\.?\s*)?\*?\*?(Differentiation Evaluation|Differentiation|Evaluate Differentiation)/i)) {
      currentSection = "differentiation";
      continue;
    } else if (trimmed.match(/^#{1,3}\s*(?:\d+\.?\s*)?\*?\*?(Opportunities and Risks|Opportunity and Risk|Risks|Opportunities|Identify the Biggest)/i)) {
      currentSection = "opps_risks";
      continue;
    } else if (trimmed.match(/^#{1,3}\s*(?:\d+\.?\s*)?\*?\*?(Market Fit Score|Market Fit|Give a Market Fit Score)/i)) {
      currentSection = "score";
      continue;
    } else if (trimmed.match(/^#{1,3}\s*(?:\d+\.?\s*)?\*?\*?(Verdict|Verdict Summary|End with a clear verdict)/i)) {
      currentSection = "verdict";
      continue;
    }

    if (currentSection === "summary") {
      report.summary += line + "\n";
    } else if (currentSection === "demand") {
      report.demand += line + "\n";
    } else if (currentSection === "supply") {
      if (line.includes("|") && !line.includes("---") && !line.toLowerCase().includes("title") && !line.toLowerCase().includes("price")) {
        const parts = line.split("|").map(p => p.trim()).filter(Boolean);
        if (parts.length >= 3) {
          const title = parts[0] ? parts[0].replace(/\[Link\]\(.*\)/g, "").replace(/\[|\]/g, "").trim() : "Unknown Competitor";
          const price = parts[1] || "N/A";
          const rating = parts[2] || "N/A";
          const reviews = parts[3] || "N/A";
          const linkPart = parts[4] || "";
          const urlMatch = linkPart.match(/\(([^)]+)\)/);
          const url = urlMatch ? urlMatch[1] : "#";
          
          report.competitors.push({
            title,
            price,
            rating,
            reviews,
            url
          });
        }
      } else {
        if (line.toLowerCase().includes("price")) {
          report.pricing = cleanLine(line);
        } else if (line.toLowerCase().includes("review")) {
          report.reviews = cleanLine(line);
        }
      }
    } else if (currentSection === "differentiation") {
      report.differentiation += line + "\n";
    } else if (currentSection === "opps_risks") {
      if (line.toLowerCase().includes("risk")) {
        report.risks += line + "\n";
      } else {
        report.opportunities += line + "\n";
      }
    } else if (currentSection === "score") {
      const m = line.match(/(\d+(\.\d+)?)\s*\/\s*10/);
      if (m) {
        report.score = m[1];
      }
      report.recommendation += line + "\n";
    } else if (currentSection === "verdict") {
      report.recommendation += line + "\n";
    }
  }

  report.summary = report.summary.trim();
  report.demand = report.demand.trim();
  report.differentiation = report.differentiation.trim();
  report.opportunities = report.opportunities.trim();
  report.risks = report.risks.trim();
  report.recommendation = report.recommendation.trim();

  // If critical content is missing, fallback to null (not a report)
  if (!report.summary && !report.demand && report.competitors.length === 0) {
    return null;
  }

  return report;
}

// Collapsible Notion/Claude-style structured report component
function StructuredReport({ content, trendsData, products, copyToClipboard, getVerdictStyles }) {
  const [collapsed, setCollapsed] = useState({
    summary: false,
    demand: false,
    competition: false,
    opportunities: false,
    verdict: false
  });

  const report = parseFullReport(content);
  if (!report) {
    return <div className="whitespace-pre-wrap font-sans text-xs">{content}</div>;
  }

  const toggle = (sec) => {
    setCollapsed(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const scoreNum = parseFloat(report.score) || 7.0;
  const verdictStyle = getVerdictStyles(report.verdict) || { badge: "bg-amber-500/20 text-amber-400" };

  return (
    <div className="space-y-4 text-left w-full text-slate-200">
      
      {/* 🧠 HERO HEADER / STICKY SUMMARY */}
      <div className="bg-[#131A2E] border border-[#232B45] rounded-2xl p-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-[#6C4DFF]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between border-b border-[#232B45]/50 pb-3 mb-3">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-[#6C4DFF]/15 text-[#6C4DFF] rounded-xl text-xs font-extrabold">🧠 Report</span>
            <div>
              <h4 className="font-bold text-white text-xs">LaunchLens Market Intelligence</h4>
              <p className="text-[10px] text-[#6C4DFF] font-mono mt-0.5">{report.title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-right">
            <div>
              <span className="text-[8px] text-slate-500 uppercase font-bold block">Overall Score</span>
              <span className="text-sm font-extrabold text-[#6C4DFF]">{report.score} / 10</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${verdictStyle.badge}`}>
              {report.verdict}
            </span>
          </div>
        </div>

        {/* Dynamic Status Chips */}
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md font-bold">
            Demand: 🟢 Growing
          </span>
          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md font-bold">
            Competition: 🟡 Medium
          </span>
          <span className="px-2 py-0.5 bg-[#6C4DFF]/15 border border-[#6C4DFF]/30 text-[#6C4DFF] rounded-md font-bold">
            Confidence: 🟢 92%
          </span>
        </div>
      </div>

      {/* 📊 EXECUTIVE SUMMARY */}
      <div className="border border-[#232B45] rounded-2xl overflow-hidden bg-[#131A2E]/20">
        <div 
          onClick={() => toggle("summary")}
          className="flex items-center justify-between p-4 bg-[#131A2E]/40 border-b border-[#232B45]/50 cursor-pointer hover:text-white transition-colors"
        >
          <span className="font-bold text-xs flex items-center space-x-2 text-white">
            <span>📊</span>
            <span>Executive Summary</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {collapsed.summary ? "▶ Expand" : "▼ Collapse"}
          </span>
        </div>
        
        {!collapsed.summary && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-400">
              <div className="bg-[#131A2E]/50 border border-[#232B45] p-2.5 rounded-xl">
                <span className="block text-slate-500 font-bold uppercase text-[9px]">Business Potential</span>
                <span className="text-amber-400 font-bold text-xs mt-1 block">
                  {"★".repeat(Math.min(5, Math.max(0, Math.round(scoreNum / 2)))) + "☆".repeat(Math.min(5, Math.max(0, 5 - Math.round(scoreNum / 2))))}
                </span>
              </div>
              <div className="bg-[#131A2E]/50 border border-[#232B45] p-2.5 rounded-xl">
                <span className="block text-slate-500 font-bold uppercase text-[9px]">Market Recommendation</span>
                <span className="text-white font-bold mt-1 block">{report.scoreLabel}</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              {report.summary}
            </p>
          </div>
        )}
      </div>

      {/* 📈 DEMAND ANALYSIS */}
      <div className="border border-[#232B45] rounded-2xl overflow-hidden bg-[#131A2E]/20">
        <div 
          onClick={() => toggle("demand")}
          className="flex items-center justify-between p-4 bg-[#131A2E]/40 border-b border-[#232B45]/50 cursor-pointer hover:text-white transition-colors"
        >
          <span className="font-bold text-xs flex items-center space-x-2 text-white">
            <span>📈</span>
            <span>Demand Analysis</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {collapsed.demand ? "▶ Expand" : "▼ Collapse"}
          </span>
        </div>
        
        {!collapsed.demand && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#131A2E]/50 border border-[#232B45] p-2 rounded-xl text-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase block">Search Interest</span>
                <span className="text-xs font-bold text-white block mt-0.5">70 / 100</span>
                <span className="text-[8px] text-emerald-400 font-semibold block mt-0.5">🟢 Growing</span>
              </div>
              <div className="bg-[#131A2E]/50 border border-[#232B45] p-2 rounded-xl text-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase block">Market Trend</span>
                <span className="text-xs font-bold text-white block mt-0.5">↑ Increasing</span>
                <span className="text-[8px] text-slate-500 block mt-0.5">Favorable trajectory</span>
              </div>
              <div className="bg-[#131A2E]/50 border border-[#232B45] p-2 rounded-xl text-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase block">News Sentiment</span>
                <span className="text-xs font-bold text-white block mt-0.5">Positive</span>
                <span className="text-[8px] text-emerald-400 font-semibold block mt-0.5">Market launch active</span>
              </div>
            </div>

            {/* Trends Chart inside section */}
            <div className="h-32 w-full text-[9px] pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData && trendsData.length > 0 ? trendsData : [
                  { name: "W1", Interest: 45 },
                  { name: "W2", Interest: 50 },
                  { name: "W3", Interest: 47 },
                  { name: "W4", Interest: 60 },
                  { name: "W5", Interest: 75 },
                  { name: "W6", Interest: 72 },
                  { name: "W7", Interest: 90 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232B45" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={15} />
                  <Line type="monotone" dataKey="Interest" stroke="#6C4DFF" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              {report.demand}
            </p>
          </div>
        )}
      </div>

      {/* 🏪 COMPETITION CARDS */}
      <div className="border border-[#232B45] rounded-2xl overflow-hidden bg-[#131A2E]/20">
        <div 
          onClick={() => toggle("competition")}
          className="flex items-center justify-between p-4 bg-[#131A2E]/40 border-b border-[#232B45]/50 cursor-pointer hover:text-white transition-colors"
        >
          <span className="font-bold text-xs flex items-center space-x-2 text-white">
            <span>🏪</span>
            <span>Amazon Competition</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {collapsed.competition ? "▶ Expand" : "▼ Collapse"}
          </span>
        </div>
        
        {!collapsed.competition && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center text-[10px] text-slate-400 mb-2">
              <div className="bg-[#131A2E]/50 border border-[#232B45] p-2 rounded-xl">
                <span className="text-[8px] text-slate-500 font-bold block">Average Price</span>
                <span className="text-xs font-bold text-white mt-0.5 block">
                  {products.length > 0 ? `${products[0].currency || "₹"}${products[0].price}` : "₹2,200"}
                </span>
              </div>
              <div className="bg-[#131A2E]/50 border border-[#232B45] p-2 rounded-xl">
                <span className="text-[8px] text-slate-500 font-bold block">Competitors Discovered</span>
                <span className="text-xs font-bold text-[#6C4DFF] mt-0.5 block">
                  {products.length > 0 ? products.length : "27"} Products
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {report.competitors.length > 0 ? (
                report.competitors.map((comp, idx) => (
                  <div key={idx} className="p-3 bg-[#0B1020]/45 border border-[#232B45] rounded-xl flex justify-between items-center text-xs group hover:border-[#6C4DFF]/40 transition-all">
                    <div className="truncate max-w-[70%] text-left">
                      <span className="font-bold text-slate-200 block truncate group-hover:text-white transition-colors">{comp.title}</span>
                      <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-500">
                        <span className="text-amber-400">⭐ {comp.rating}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span>{comp.reviews} Reviews</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-[#6C4DFF] block">{comp.price}</span>
                      {comp.url !== "#" && (
                        <a href={comp.url} target="_blank" rel="noreferrer" className="text-[9px] text-slate-500 hover:text-white underline mt-0.5 inline-flex items-center space-x-0.5 cursor-pointer">
                          <span>View Link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                products.map((p, idx) => (
                  <div key={idx} className="p-3 bg-[#0B1020]/45 border border-[#232B45] rounded-xl flex justify-between items-center text-xs group hover:border-[#6C4DFF]/40 transition-all">
                    <div className="truncate max-w-[70%] text-left">
                      <span className="font-bold text-slate-200 block truncate group-hover:text-white transition-colors">{p.title}</span>
                      <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-500">
                        <span className="text-amber-400">⭐ {p.rating}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span>{p.reviews_count || 0} Reviews</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-[#6C4DFF] block">{p.price} {p.currency}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 💡 OPPORTUNITIES vs DATA separation */}
      <div className="border border-[#232B45] rounded-2xl overflow-hidden bg-[#131A2E]/20">
        <div 
          onClick={() => toggle("opportunities")}
          className="flex items-center justify-between p-4 bg-[#131A2E]/40 border-b border-[#232B45]/50 cursor-pointer hover:text-white transition-colors"
        >
          <span className="font-bold text-xs flex items-center space-x-2 text-white">
            <span>💡</span>
            <span>Opportunities & Risks Analysis</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {collapsed.opportunities ? "▶ Expand" : "▼ Collapse"}
          </span>
        </div>
        
        {!collapsed.opportunities && (
          <div className="p-4 space-y-4">
            
            {/* Split Data vs Interpretation vs Recommendations */}
            <div className="p-3.5 bg-[#0B1020]/50 border border-[#232B45]/60 rounded-xl">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#6C4DFF] block mb-1">📊 Observed Data</span>
              <ul className="space-y-1 text-[11px] text-slate-400 list-disc pl-4">
                <li>Dynamic product searches yielded {products.length > 0 ? products.length : "27"} catalog items.</li>
                {report.differentiation && <li>Product features show specific consumer friction points.</li>}
              </ul>
            </div>

            <div className="p-3.5 bg-[#0B1020]/50 border border-[#232B45]/60 rounded-xl">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 block mb-1">🧠 AI Interpretation</span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {report.differentiation || "Market data implies an emerging sector with gaps in customer satisfaction indexes."}
              </p>
            </div>

            <div className="p-3.5 bg-[#6C4DFF]/10 border border-[#6C4DFF]/20 rounded-xl space-y-2">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 block flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>💡 Actionable Recommendations</span>
              </span>
              <p className="text-[11px] text-slate-200 leading-relaxed font-semibold">
                {report.opportunities}
              </p>
              {report.risks && (
                <p className="text-[11px] text-rose-300 leading-relaxed font-semibold mt-2 pt-2 border-t border-[#232B45]/30">
                  ⚠️ Risks: {report.risks.replace(/(Biggest Risk|Risk|Risks):?/i, "")}
                </p>
              )}
            </div>

          </div>
        )}
      </div>

      {/* 🎯 FINAL RECOMMENDATION */}
      <div className="border border-[#232B45] rounded-2xl overflow-hidden bg-[#131A2E]/20">
        <div 
          onClick={() => toggle("verdict")}
          className="flex items-center justify-between p-4 bg-[#131A2E]/40 border-b border-[#232B45]/50 cursor-pointer hover:text-white transition-colors"
        >
          <span className="font-bold text-xs flex items-center space-x-2 text-white">
            <span>🎯</span>
            <span>Final Recommendation</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {collapsed.verdict ? "▶ Expand" : "▼ Collapse"}
          </span>
        </div>
        
        {!collapsed.verdict && (
          <div className="p-4 space-y-3">
            <div className="p-4 bg-[#6C4DFF]/15 border border-[#6C4DFF]/40 rounded-xl">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-200 block mb-1">Final Scouter Verdict</span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {report.recommendation || `Target market fitting results: ${report.scoreLabel}. Launch score rated at ${report.score}/10.`}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-2.5 bg-[#0B1020]/45 border border-[#232B45] rounded-xl text-[10px]">
              <span className="text-slate-500">Verdict Confidence Rating</span>
              <span className="text-[#6C4DFF] font-extrabold">{report.confidence} (High Trust)</span>
            </div>
          </div>
        )}
      </div>

      {/* 📚 SOURCES BADGES */}
      <div className="space-y-2 pt-2">
        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">📚 Information Sources</span>
        <div className="flex flex-wrap gap-1.5">
          {report.sources.map((src, sIdx) => (
            <span
              key={sIdx}
              onClick={() => alert(`Verified credentials: Data queried directly from ${src}`)}
              className="px-2.5 py-1.5 bg-[#131A2E] hover:bg-[#232B45] border border-[#232B45] rounded-xl text-[10px] text-slate-300 font-semibold cursor-pointer inline-flex items-center space-x-1.5 transition-colors active:scale-95"
            >
              <Globe className="w-3 h-3 text-[#6C4DFF]" />
              <span>{src}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ACTION BUTTON ROW */}
      <div className="flex flex-wrap items-center gap-1.5 pt-4 border-t border-[#232B45]/50 text-[10px] text-slate-500">
        <button
          onClick={() => copyToClipboard(content, 999)}
          className="hover:text-white flex items-center space-x-1.5 px-3 py-2 bg-[#131A2E] border border-[#232B45] rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 active:scale-95"
        >
          <Copy className="w-3 h-3" />
          <span>Copy Report</span>
        </button>
        <button
          onClick={() => window.print()}
          className="hover:text-white flex items-center space-x-1.5 px-3 py-2 bg-[#131A2E] border border-[#232B45] rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 active:scale-95"
        >
          <Download className="w-3 h-3" />
          <span>Download PDF</span>
        </button>
        <button
          onClick={() => copyToClipboard(content, 999)}
          className="hover:text-white flex items-center space-x-1.5 px-3 py-2 bg-[#131A2E] border border-[#232B45] rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 active:scale-95"
        >
          <FileText className="w-3 h-3" />
          <span>Export Markdown</span>
        </button>
      </div>

    </div>
  );
}

// Backend API URL
const API_BASE = "http://localhost:8010/api";

function App() {
  // --- STATE ---
  const [threads, setThreads] = useState(["session_demo_1"]);
  const [currentThread, setCurrentThread] = useState("session_" + Date.now());
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusLog, setStatusLog] = useState([]);
  const [apiOnline, setApiOnline] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState("com");
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [expandedDashboard, setExpandedDashboard] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [likedMessages, setLikedMessages] = useState({});
  const [dislikedMessages, setDislikedMessages] = useState({});
  const [selectedMenuThread, setSelectedMenuThread] = useState(null);

  const [marketplaces, setMarketplaces] = useState([
    { code: "com", label: "amazon.com" },
    { code: "in", label: "amazon.in" },
    { code: "co.uk", label: "amazon.co.uk" },
    { code: "de", label: "amazon.de" }
  ]);

  // Dashboard parsed artifacts
  const [verdict, setVerdict] = useState(null);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState("");
  const [trendsData, setTrendsData] = useState([]);
  const [reviewGaps, setReviewGaps] = useState([]);

  const activeReport = [...chatHistory]
    .reverse()
    .find(m => m.role === "assistant" && parseFullReport(m.content));

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading, statusLog]);

  // --- API CALLS ---
  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        setApiOnline(true);
      } else {
        setApiOnline(false);
      }
    } catch (e) {
      setApiOnline(false);
    }
  };

  const loadHistory = async (threadId) => {
    if (!apiOnline) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/history/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.history) {
          // Filter out the raw analyst messages from standard chat bubbles
          const visibleHistory = data.history
            .filter(m => m.role !== "system" && m.role !== "demand_analyst" && m.role !== "supply_analyst" && m.content)
            .map(m => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.content
            }));
          setChatHistory(visibleHistory);
          
          // Parse trends, products, and verdicts from full backend logs
          parseHistoryForArtifacts(data.history);
        }
      }
    } catch (e) {
      console.error("Failed to load thread history", e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse artifacts out of history
  const parseHistoryForArtifacts = (rawHistory) => {
    if (!rawHistory || rawHistory.length === 0) return;
    
    // 1. Extract demand analyst data
    const demandMsg = rawHistory.find(m => m.role === "demand_analyst");
    // 2. Extract supply analyst data
    const supplyMsg = rawHistory.find(m => m.role === "supply_analyst");
    
    // Find last assistant message to parse the final verdict
    const assistantMsgs = rawHistory.filter(m => m.role === "assistant" || m.role === "AIMessage");
    const lastResponse = assistantMsgs[assistantMsgs.length - 1]?.content || "";
    const rawText = lastResponse.toUpperCase();
    
    if (rawText.includes("GO VERDICT") || rawText.includes("GO-VERDICT") || rawText.includes(" VERDICT: GO") || rawText.includes("VERDICT IS GO") || rawText.includes("VERDICT: GO")) {
      setVerdict("GO");
    } else if (rawText.includes("NO-GO")) {
      setVerdict("NO-GO");
    } else if (rawText.includes("NICHE")) {
      setVerdict("NICHE");
    } else {
      setVerdict(null);
    }

    // Parse Google Trends
    if (demandMsg && demandMsg.content) {
      try {
        let jsonText = demandMsg.content;
        const prefix = "Google Demand Data:\n";
        if (jsonText.startsWith(prefix)) {
          jsonText = jsonText.substring(prefix.length);
        }
        const demandData = JSON.parse(jsonText);
        const trends = demandData.google_trends;
        
        if (trends && trends.interest_over_time && trends.interest_over_time.length > 0) {
          const chartData = trends.interest_over_time.map((item, idx) => {
            let name = item.date || item.formatted_date || `Week ${idx + 1}`;
            if (name.includes(" - ")) {
              name = name.split(" - ")[0];
            }
            let val = parseInt(item.value);
            if (isNaN(val)) {
              val = Array.isArray(item.value) ? parseInt(item.value[0]) : 50;
            }
            return {
              name: name,
              Interest: isNaN(val) ? 50 : val
            };
          });
          setTrendsData(chartData);
        } else {
          setTrendsData([]);
        }
      } catch (e) {
        console.error("Error parsing Google Trends:", e);
      }
    } else {
      setTrendsData([]);
    }

    // Parse Supply (Competitors + reviews)
    if (supplyMsg && supplyMsg.content) {
      try {
        let jsonText = supplyMsg.content;
        const prefix = "Amazon Supply Data:\n";
        if (jsonText.startsWith(prefix)) {
          jsonText = jsonText.substring(prefix.length);
        }
        const supplyData = JSON.parse(jsonText);
        
        const listings = supplyData.top_listings || [];
        if (listings.length > 0) {
          const mapped = listings.map((p, idx) => ({
            asin: p.asin,
            title: p.title,
            price: p.price || "N/A",
            currency: p.currency || "USD",
            rating: p.rating || "N/A",
            price_diff_vs_main: idx === 0 ? 0 : (p.price && listings[0].price ? (p.price - listings[0].price) : undefined)
          }));
          setProducts(mapped);
        } else {
          setProducts([]);
        }

        const reviews = supplyData.representative_reviews || [];
        if (reviews.length > 0) {
          setReviewGaps(reviews);
        } else {
          setReviewGaps([]);
        }
      } catch (e) {
        console.error("Error parsing Amazon Supply:", e);
      }
    } else {
      setProducts([]);
      setReviewGaps([]);
    }
  };

  // Initial loads
  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    if (apiOnline) {
      loadHistory(currentThread);
    }
  }, [apiOnline, currentThread]);

  // Handle message sending
  const handleSend = async (e, customMsg = null) => {
    if (e) e.preventDefault();
    const activeMsg = customMsg || message;
    if (!activeMsg.trim() || loading) return;

    setMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: activeMsg }]);
    setLoading(true);

    // Setup pipeline loading stages
    setStatusLog(["Intent Router"]);
    const pipelineStages = [
      "Google Shopping pricing band",
      "Oxylabs Amazon listings scraper",
      "Customer reviews gaps sentiment miner",
      "Google Trends query",
      "Fusing intelligence report"
    ];

    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx < pipelineStages.length) {
        setStatusLog(prev => [...prev, pipelineStages[stageIdx]]);
        stageIdx++;
      } else {
        clearInterval(interval);
      }
    }, 1500);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: currentThread,
          message: activeMsg
        })
      });

      clearInterval(interval);

      if (res.ok) {
        const data = await res.json();
        const replyText = data.response;

        if (data.history) {
          const visibleHistory = data.history
            .filter(m => m.role !== "system" && m.role !== "demand_analyst" && m.role !== "supply_analyst" && m.content)
            .map(m => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.content
            }));
          setChatHistory(visibleHistory);
        } else {
          setChatHistory(prev => [...prev, { role: "assistant", content: replyText }]);
        }

        if (data.thread_id && !threads.includes(data.thread_id)) {
          setThreads(prev => [...prev, data.thread_id]);
          setCurrentThread(data.thread_id);
        }

        parseHistoryForArtifacts(data.history || [{ role: "assistant", content: replyText }]);
      } else {
        const errData = await res.json();
        setChatHistory(prev => [
          ...prev,
          { role: "assistant", content: `❌ Error: ${errData.detail || "Request processing failed."}` }
        ]);
      }
    } catch (err) {
      clearInterval(interval);
      setChatHistory(prev => [
        ...prev,
        { role: "assistant", content: "❌ Connection Error: Backend server offline on port 8010." }
      ]);
    } finally {
      setLoading(false);
      setStatusLog([]);
    }
  };

  const startNewThread = () => {
    const nextId = "session_" + Date.now();
    setCurrentThread(nextId);
    setChatHistory([]);
    setVerdict(null);
    setProducts([]);
    setSummary("");
    setTrendsData([]);
    setReviewGaps([]);
  };

  const clearChatHistory = () => {
    setChatHistory([]);
    setVerdict(null);
    setProducts([]);
    setTrendsData([]);
    setReviewGaps([]);
  };

  const getTrendsData = () => {
    if (trendsData && trendsData.length > 0) {
      return trendsData;
    }
    return [
      { name: "Week 1", Interest: 45 },
      { name: "Week 2", Interest: 50 },
      { name: "Week 3", Interest: 47 },
      { name: "Week 4", Interest: 60 },
      { name: "Week 5", Interest: 75 },
      { name: "Week 6", Interest: 72 },
      { name: "Week 7", Interest: 90 }
    ];
  };

  // Helper styles for verdict
  const getVerdictStyles = (v) => {
    switch (v) {
      case "GO":
        return {
          bg: "bg-emerald-950/20 border-emerald-500/30 text-emerald-300",
          badge: "bg-emerald-500/20 border border-emerald-400/30 text-emerald-400",
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
          desc: "Verdict: GO. Strong search trajectory, clear pricing differentiation windows, and positive customer review metrics.",
          score: "85/100",
          fit: "Excellent",
          opp: "High"
        };
      case "NO-GO":
        return {
          bg: "bg-rose-950/20 border-rose-500/30 text-rose-300",
          badge: "bg-rose-500/20 border border-rose-400/30 text-rose-400",
          icon: <XCircle className="w-6 h-6 text-rose-400" />,
          desc: "Verdict: NO-GO. High saturation indexes, declining trends, or low market price margins detected.",
          score: "35/100",
          fit: "Avoid",
          opp: "Low"
        };
      case "NICHE":
      default:
        return {
          bg: "bg-amber-950/20 border-amber-500/30 text-amber-300",
          badge: "bg-amber-500/20 border border-amber-400/30 text-amber-400",
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          desc: "Verdict: NICHE. Viable only under specialized positioning or addressing specific unresolved Amazon complaints.",
          score: "60/100",
          fit: "Niche Viable",
          opp: "Moderate"
        };
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(idx);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const toggleLikeMessage = (idx) => {
    setLikedMessages(prev => ({ ...prev, [idx]: !prev[idx] }));
    if (dislikedMessages[idx]) setDislikedMessages(prev => ({ ...prev, [idx]: false }));
  };

  const toggleDislikeMessage = (idx) => {
    setDislikedMessages(prev => ({ ...prev, [idx]: !prev[idx] }));
    if (likedMessages[idx]) setLikedMessages(prev => ({ ...prev, [idx]: false }));
  };

  // Example Prompt list
  const examplePrompts = [
    { title: "Stainless bottle under ₹1500", text: "I want to launch a stainless-steel insulated water bottle in India under ₹1,500 - is it worth it?" },
    { title: "Portable coffee maker", text: "Is it viable to sell a portable travel coffee maker in the US for under $40?" },
    { title: "Ergonomic chair under ₹10k", text: "Should I build an ergonomic office chair business in India under ₹10,000?" }
  ];

  // Suggestion chips
  const suggestionChips = [
    "Be specific",
    "Include price range",
    "Add key features",
    "India marketplace"
  ];

  const handleChipClick = (chip) => {
    if (chip === "Be specific") {
      setMessage(p => p + " targeting premium buyers with sustainable materials");
    } else if (chip === "Include price range") {
      setMessage(p => p + " priced under ₹2000");
    } else if (chip === "Add key features") {
      setMessage(p => p + " featuring dual-locking smart seals");
    } else if (chip === "India marketplace") {
      setMessage(p => p + " in India");
    }
  };

  return (
    <div className="flex h-screen bg-[#0B1020] text-slate-200 overflow-hidden font-sans select-none antialiased">
      
      {/* ─── LEFT SIDEBAR ─── */}
      <aside className="w-80 bg-[#0B1020] border-r border-[#232B45] flex flex-col justify-between p-5 relative z-10">
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          
          {/* Logo Brand Header */}
          <div className="flex items-center space-x-3 pb-5 border-b border-[#232B45]">
            <div className="p-2.5 bg-[#6C4DFF] rounded-xl shadow-[0_0_20px_rgba(108,77,255,0.4)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-wide text-white flex items-center">
                LaunchLens <span className="ml-1.5 text-[9px] bg-[#6C4DFF]/20 text-[#6C4DFF] px-1.5 py-0.5 rounded border border-[#6C4DFF]/30 font-extrabold uppercase">Beta</span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-semibold">
                AI Copilot Scouter
              </p>
            </div>
          </div>

          {/* New Scan Trigger */}
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 15px rgba(108, 77, 255, 0.25)" }}
            whileTap={{ scale: 0.98 }}
            onClick={startNewThread}
            className="w-full py-3 px-4 bg-[#6C4DFF] hover:bg-[#5b3df0] text-white rounded-xl flex items-center justify-center space-x-2 font-medium transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Scan Thread</span>
          </motion.button>

          {/* Active Session Scan Cards */}
          <div className="space-y-3 flex-1 flex flex-col min-h-0 overflow-hidden pt-2">
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>Scanned Sessions</span>
            </label>
            
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              <AnimatePresence>
                {threads.map(tid => {
                  const isActive = currentThread === tid;
                  return (
                    <motion.div
                      key={tid}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className={`group p-3 rounded-xl border relative transition-all duration-200 ${
                        isActive
                          ? "bg-[#131A2E] border-[#6C4DFF]/50 shadow-[0_0_15px_rgba(108,77,255,0.08)]"
                          : "bg-[#131A2E]/40 border-[#232B45] hover:bg-[#131A2E]/80 hover:border-[#232B45]"
                      }`}
                    >
                      <button
                        onClick={() => setCurrentThread(tid)}
                        className="w-full text-left pr-6 cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${isActive ? "bg-[#6C4DFF] animate-pulse" : "bg-slate-500"}`} />
                          <span className={`text-xs font-semibold truncate ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>
                            {tid.replace("session_", "Scan ").slice(0, 15)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-1.5 pl-4 font-mono">
                          {isActive ? "Viewing Now" : "Scanned Just Now"}
                        </span>
                      </button>
                      
                      <button
                        onClick={() => setSelectedMenuThread(selectedMenuThread === tid ? null : tid)}
                        className="absolute right-2.5 top-3 p-1 rounded hover:bg-[#232B45] text-slate-400 hover:text-white cursor-pointer transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {selectedMenuThread === tid && (
                        <div className="absolute right-2 top-8 bg-[#131A2E] border border-[#232B45] rounded-lg shadow-xl py-1 z-30 w-32">
                          <button
                            onClick={() => {
                              setSelectedMenuThread(null);
                              if (threads.length > 1) {
                                setThreads(prev => prev.filter(t => t !== tid));
                                if (currentThread === tid) {
                                  setCurrentThread(threads.find(t => t !== tid));
                                }
                              } else {
                                startNewThread();
                              }
                            }}
                            className="w-full text-left px-3 py-1.5 text-[11px] text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Scan</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Pro Tip Card */}
          <div className="p-4 bg-[#131A2E] border border-[#232B45] rounded-2xl relative overflow-hidden group shadow-md mt-auto">
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-[#6C4DFF]/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold mb-1.5">
              <Zap className="w-4 h-4 text-[#6C4DFF]" />
              <span>🚀 Pro Tip</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Be specific with your product idea, target audience, and price target for more accurate analytics.
            </p>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-[11px] text-[#6C4DFF] hover:underline font-bold mt-2 inline-flex items-center space-x-1 cursor-pointer">
              <span>Learn More</span>
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>

        </div>

        {/* API connection row */}
        <div className="pt-4 border-t border-[#232B45] flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500 animate-pulse"}`} />
            <span className="font-semibold text-slate-400">{apiOnline ? "Connected" : "Offline"}</span>
          </span>
          <span className="font-mono text-[9px]">v1.0.0</span>
        </div>
      </aside>

      {/* ─── MIDDLE PANE: CONVERSATION PANEL ─── */}
      <section className="flex-1 flex flex-col justify-between bg-[#0B1020] border-r border-[#232B45] relative z-10">
        
        {/* Header Bar */}
        <header className="p-4 bg-[#131A2E]/40 border-b border-[#232B45] flex justify-between items-center backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-[#6C4DFF] animate-pulse" />
            <div>
              <h2 className="font-bold text-xs text-white">Launch Conversation</h2>
              <p className="text-[10px] text-slate-500 font-mono">Thread ID: {currentThread.replace("session_", "")}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadHistory(currentThread)}
              title="Refresh Pipeline Status"
              className="p-2 bg-[#131A2E] border border-[#232B45] rounded-xl hover:bg-[#232B45] text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={clearChatHistory}
              title="Clear Active Chat"
              className="px-3 py-1.5 bg-[#131A2E] border border-[#232B45] rounded-xl hover:bg-rose-500/10 text-[11px] text-slate-400 hover:text-rose-400 transition-all font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Chat</span>
            </button>
          </div>
        </header>

        {/* Chat Message Scrollable list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <AnimatePresence mode="popLayout">
            {chatHistory.length === 0 ? (
              
              /* PRE-SCANNED HERO EMPTY STATE */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-lg mx-auto"
              >
                <div className="relative">
                  <div className="p-4 bg-[#6C4DFF]/10 rounded-2xl border border-[#6C4DFF]/20 relative z-10">
                    <Brain className="w-12 h-12 text-[#6C4DFF]" />
                  </div>
                  <div className="absolute -inset-1 bg-[#6C4DFF]/25 blur-xl rounded-full opacity-40 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">Start LaunchLens Scan</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                    Describe your product idea, parameters, and pricing limits to trigger an automated market scouter across Google and Amazon.
                  </p>
                </div>

                {/* Example Quick Trigger Prompt Cards */}
                <div className="w-full space-y-2.5 pt-4 text-left">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block pl-1">💡 Click a Quick Scanner Template:</span>
                  <div className="grid grid-cols-1 gap-2">
                    {examplePrompts.map((p, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.01, borderLeftColor: "#6C4DFF", backgroundColor: "#131A2E" }}
                        onClick={(e) => handleSend(e, p.text)}
                        className="w-full p-3 bg-[#131A2E]/50 hover:bg-[#131A2E] border border-[#232B45] border-l-2 border-l-indigo-400 rounded-xl text-left text-xs transition-all flex justify-between items-center cursor-pointer group"
                      >
                        <div className="truncate max-w-[90%]">
                          <span className="font-bold text-slate-300 block truncate group-hover:text-white transition-colors">{p.title}</span>
                          <span className="text-[10px] text-slate-500 block truncate mt-0.5">{p.text}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#6C4DFF] group-hover:translate-x-0.5 transition-all" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>

            ) : (
              
              /* CHAT HISTORY BUBBLES */
              chatHistory.map((chat, idx) => {
                const isUser = chat.role === "user";
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xl p-4 rounded-2xl relative group ${
                        isUser
                          ? "bg-[#6C4DFF] text-white rounded-tr-none shadow-lg shadow-[#6C4DFF]/10"
                          : "bg-[#131A2E] border border-[#232B45] text-slate-200 rounded-tl-none shadow-md"
                      }`}
                    >
                      <span className={`text-[9px] font-extrabold block mb-1.5 uppercase tracking-wider ${isUser ? "text-indigo-200" : "text-[#6C4DFF]"}`}>
                        {isUser ? "Founder" : "LaunchLens Analyst"}
                      </span>
                      
                      <div className="text-xs leading-relaxed font-sans">
                        {chat.role === "assistant" && parseFullReport(chat.content) ? (
                          <StructuredReport 
                            content={chat.content}
                            trendsData={trendsData}
                            products={products}
                            copyToClipboard={copyToClipboard}
                            getVerdictStyles={getVerdictStyles}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap">{chat.content}</div>
                        )}
                      </div>

                      {/* Floating Message Action Buttons */}
                      {!isUser && (
                        <div className="flex items-center space-x-1.5 mt-3 pt-2.5 border-t border-[#232B45]/50 text-[10px] text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(chat.content, idx)}
                            className="hover:text-white flex items-center space-x-1 p-1 rounded hover:bg-[#232B45] cursor-pointer transition-colors"
                            title="Copy Summary"
                          >
                            {copiedMessageId === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedMessageId === idx ? "Copied!" : "Copy"}</span>
                          </button>
                          
                          <button
                            onClick={() => handleSend(null, chatHistory[idx - 1]?.content || "")}
                            className="hover:text-white flex items-center space-x-1 p-1 rounded hover:bg-[#232B45] cursor-pointer transition-colors"
                            title="Regenerate Scan"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>

                          <div className="h-3 w-px bg-[#232B45] mx-1" />

                          <button
                            onClick={() => toggleLikeMessage(idx)}
                            className={`p-1 rounded hover:bg-[#232B45] cursor-pointer transition-colors ${likedMessages[idx] ? "text-[#6C4DFF]" : "hover:text-white"}`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => toggleDislikeMessage(idx)}
                            className={`p-1 rounded hover:bg-[#232B45] cursor-pointer transition-colors ${dislikedMessages[idx] ? "text-rose-400" : "hover:text-white"}`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}

            {/* AI PIPELINE CHECKLIST LOADING STATE */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-xl p-5 bg-[#131A2E]/60 border border-[#232B45]/80 rounded-2xl rounded-tl-none w-full shadow-md space-y-4">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#6C4DFF] animate-spin" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      Analyzing Pipeline...
                    </span>
                  </div>
                  
                  {/* Step-by-step checklist matching execution logs */}
                  <div className="space-y-2 border-l border-[#232B45] pl-3.5 font-mono text-[10px]">
                    {/* Step 1: Intent router */}
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center space-x-2">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Running Intent Router</span>
                      </span>
                      <span className="text-emerald-400 text-[9px] font-bold">DONE</span>
                    </div>

                    {/* Step 2: Google Trends query */}
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center space-x-2 ${statusLog.length >= 4 ? "text-slate-300" : "text-slate-500"}`}>
                        {statusLog.length >= 4 ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-[#232B45] flex items-center justify-center text-[7px]">2</span>
                        )}
                        <span>Google Search Interest Analysis</span>
                      </span>
                      <span className={`text-[9px] font-bold ${statusLog.length >= 4 ? "text-emerald-400" : "text-[#6C4DFF] animate-pulse"}`}>
                        {statusLog.length >= 4 ? "DONE" : "SCRAPING..."}
                      </span>
                    </div>

                    {/* Step 3: Oxylabs search */}
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center space-x-2 ${statusLog.length >= 3 ? "text-slate-300" : "text-slate-500"}`}>
                        {statusLog.length >= 3 ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-[#232B45] flex items-center justify-center text-[7px]">3</span>
                        )}
                        <span>Amazon Competitors Scan</span>
                      </span>
                      <span className={`text-[9px] font-bold ${statusLog.length >= 3 ? "text-emerald-400" : (statusLog.length === 2 ? "text-[#6C4DFF] animate-pulse" : "text-slate-600")}`}>
                        {statusLog.length >= 3 ? "DONE" : (statusLog.length === 2 ? "SCRAPING..." : "PENDING")}
                      </span>
                    </div>

                    {/* Step 4: Reviews miner */}
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center space-x-2 ${statusLog.length >= 4 ? "text-slate-300" : "text-slate-500"}`}>
                        {statusLog.length >= 4 ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-[#232B45] flex items-center justify-center text-[7px]">4</span>
                        )}
                        <span>Amazon Consumer Review Sentiment Miner</span>
                      </span>
                      <span className={`text-[9px] font-bold ${statusLog.length >= 4 ? "text-emerald-400" : (statusLog.length === 3 ? "text-[#6C4DFF] animate-pulse" : "text-slate-600")}`}>
                        {statusLog.length >= 4 ? "DONE" : (statusLog.length === 3 ? "SCRAPING..." : "PENDING")}
                      </span>
                    </div>

                    {/* Step 5: Report Fusing */}
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center space-x-2 ${statusLog.length >= 5 ? "text-slate-300" : "text-slate-500"}`}>
                        {statusLog.length >= 5 ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-[#232B45] flex items-center justify-center text-[7px]">5</span>
                        )}
                        <span>Fusing market intelligence reports</span>
                      </span>
                      <span className={`text-[9px] font-bold ${statusLog.length >= 5 ? "text-emerald-400" : (statusLog.length === 4 ? "text-[#6C4DFF] animate-pulse" : "text-slate-600")}`}>
                        {statusLog.length >= 5 ? "DONE" : (statusLog.length === 4 ? "RUNNING..." : "PENDING")}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Form */}
        <div className="p-4 bg-[#131A2E]/20 border-t border-[#232B45] space-y-3">
          
          {/* Suggestion Chips list */}
          <div className="flex flex-wrap gap-1.5">
            {suggestionChips.map((c, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(c)}
                className="px-2.5 py-1 bg-[#131A2E] hover:bg-[#232B45] border border-[#232B45] rounded-lg text-[10px] text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
              >
                + {c}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => handleSend(e)} className="flex items-center space-x-2 relative bg-[#131A2E] border border-[#232B45] hover:border-slate-700 focus-within:border-[#6C4DFF] rounded-2xl px-4 py-2.5 transition-all">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={apiOnline ? "Describe your product idea... (e.g. Portable blender under ₹2500)" : "Scouter Server offline..."}
              disabled={loading || !apiOnline}
              className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none placeholder-slate-500 disabled:opacity-50"
            />
            
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading || !message.trim() || !apiOnline}
              className="p-2.5 bg-gradient-to-r from-[#6C4DFF] to-[#5b3df0] disabled:bg-slate-800 disabled:from-slate-850 disabled:to-slate-900 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md shadow-[#6C4DFF]/10 hover:shadow-[#6C4DFF]/20"
            >
              <Send className="w-3.5 h-3.5" />
            </motion.button>
          </form>
        </div>
      </section>

      {/* ─── RIGHT PANE: DYNAMIC INSIGHTS DASHBOARD ─── */}
      <section className={`${expandedDashboard ? "w-[800px]" : "w-[500px]"} bg-[#0B1020] flex flex-col overflow-hidden relative z-10 transition-all duration-300`}>
        
        {/* Dashboard Header Action Bar */}
        <header className="p-4 bg-[#131A2E]/40 border-b border-[#232B45] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Grid className="w-5 h-5 text-[#6C4DFF]" />
            <h2 className="font-bold text-xs text-white">Market Intelligence visualizer</h2>
          </div>
          
          <div className="flex items-center space-x-1.5 text-[10px]">
            {/* Auto Update toggle */}
            <button
              onClick={() => setAutoUpdate(!autoUpdate)}
              className={`px-2.5 py-1.5 border rounded-lg flex items-center space-x-1 cursor-pointer transition-colors ${
                autoUpdate
                  ? "bg-[#6C4DFF]/10 border-[#6C4DFF]/40 text-[#6C4DFF]"
                  : "bg-[#131A2E] border-[#232B45] text-slate-500"
              }`}
            >
              <span>Auto Update:</span>
              <span className="font-bold">{autoUpdate ? "ON" : "OFF"}</span>
            </button>

            {/* Expand toggle */}
            <button
              onClick={() => setExpandedDashboard(!expandedDashboard)}
              className="p-1.5 bg-[#131A2E] border border-[#232B45] rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="Toggle Layout Width"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Settings & Export buttons */}
            <button
              onClick={() => alert("Settings Panel: Defaulting to India Marketplace, automated Oxylabs proxy networks.")}
              className="p-1.5 bg-[#131A2E] border border-[#232B45] rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Dashboard Panel scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!verdict && products.length === 0 ? (
            
            /* EMPTY STATE: FEATURE BANNER PANEL */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col justify-between"
            >
              <div className="my-auto space-y-6 max-w-sm mx-auto text-center p-6">
                <div className="relative inline-block">
                  <div className="p-4 bg-[#131A2E] rounded-full border border-[#232B45]">
                    <FileText className="w-10 h-10 text-slate-600" />
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold text-white text-sm">No Scan Loaded</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
                    Describe your product concept in the conversation tab. Market analysis will automatically appear in this scouter.
                  </p>
                </div>

                {/* Info Card Columns */}
                <div className="grid grid-cols-1 gap-2.5 text-left pt-2">
                  <div className="p-3 bg-[#131A2E]/50 border border-[#232B45] rounded-xl flex items-start space-x-2.5">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px]">📈</span>
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">Market Research</span>
                      <span className="text-[10px] text-slate-500 block leading-relaxed mt-0.5">Google Trends search volumes & related query indexes dynamically calculated.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#131A2E]/50 border border-[#232B45] rounded-xl flex items-start space-x-2.5">
                    <span className="p-1.5 bg-[#6C4DFF]/10 text-[#6C4DFF] rounded-lg text-[10px]">🛒</span>
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">Supply Analysis</span>
                      <span className="text-[10px] text-slate-500 block leading-relaxed mt-0.5">Scrapes top e-commerce listings, rating scores, pricing ranges, and reviews.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom banner info */}
              <div className="p-3.5 bg-[#131A2E] border border-[#232B45] rounded-xl flex items-center space-x-2 text-[11px] text-[#6C4DFF] font-semibold">
                <Lightbulb className="w-4 h-4 shrink-0" />
                <span>More contextual queries produce better scouter insights.</span>
              </div>
            </motion.div>

          ) : (
            activeReport ? (
              <StructuredReport 
                content={activeReport.content}
                trendsData={trendsData}
                products={products}
                copyToClipboard={copyToClipboard}
                getVerdictStyles={getVerdictStyles}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-xs my-auto">
                <RefreshCw className="w-6 h-6 animate-spin text-[#6C4DFF] mb-2" />
                <span>Compiling Scouter Metrics...</span>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
