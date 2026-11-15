/**
 * HEALML Enterprise – Client Support Tickets & Help Center
 * Allows clients to submit technical support tickets, view replies,
 * and track resolution status in real time.
 */

import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  User,
  Shield,
  Search,
  Filter
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { UserProfile } from '../types/auth';

interface ClientSupportTicketsViewProps {
  currentUser: UserProfile;
}

export const ClientSupportTicketsView: React.FC<ClientSupportTicketsViewProps> = ({ currentUser }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // New Ticket Form State
  const [category, setCategory] = useState('TECHNICAL_SUPPORT');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getMyTickets().catch(() => ({ tickets: [] }));
      if (res && Array.isArray(res.tickets)) {
        setTickets(res.tickets);
      }
    } catch (err: any) {
      console.warn('Could not load tickets:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubject = (subject || '').trim();
    const cleanDesc = (description || '').trim();
    if (!cleanSubject || !cleanDesc) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const res = await apiClient.createSupportTicket({
        category,
        subject: cleanSubject,
        description: cleanDesc,
        priority,
        name: currentUser.fullName,
        email: currentUser.email,
      });
      setStatusMsg({ text: 'Support ticket submitted successfully.', type: 'success' });
      setIsCreateOpen(false);
      setSubject('');
      setDescription('');
      loadTickets();
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to submit ticket.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReply = (replyMessage || '').trim();
    if (!selectedTicket || !cleanReply) return;
    setReplying(true);
    try {
      await apiClient.replyTicket(selectedTicket.id, cleanReply);
      setReplyMessage('');
      loadTickets();
      // Update selected ticket locally
      setSelectedTicket((prev: any) => {
        if (!prev) return null;
        const newReply = {
          id: `rep_${Date.now()}`,
          author: currentUser.fullName,
          message: cleanReply,
          created_at: new Date().toISOString(),
          is_admin: false,
        };
        return {
          ...prev,
          replies: [...(prev.replies || []), newReply]
        };
      });
    } catch (err: any) {
      alert(err.message || 'Failed to send reply.');
    } finally {
      setReplying(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.subject && t.subject.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Client Help & Support Tickets
            </h1>
            <span className="text-[11px] font-mono text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
              Enterprise SLAs
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Submit questions, ML pipeline anomalies, or platform feature requests directly to enterprise engineering.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Support Request</span>
          </button>
          <button
            onClick={loadTickets}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            title="Refresh Tickets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-medium border ${
          statusMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          {statusMsg.text}
        </div>
      )}

      {/* Ticket List and Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tickets List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket subject, ID, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              {filteredTickets.length} tickets
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Loading your support tickets...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 mx-auto flex items-center justify-center">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">No Tickets Found</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have no active support requests. Submit a ticket if you need assistance with dataset ingestion, pipeline repairs, or model deployment.
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Your First Request</span>
              </button>
            </div>
          ) : (
            filteredTickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const isResolved = t.status === 'RESOLVED';
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700 shadow-sm'
                      : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {t.id}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isResolved
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : t.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {t.status || 'OPEN'}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {t.subject}
                  </h3>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-400">
                    <span>{t.category?.replace(/_/g, ' ') || 'GENERAL'}</span>
                    <span>{new Date(t.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Ticket Conversation & Details */}
        <div className="space-y-4">
          {selectedTicket ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold block mb-1">
                  {selectedTicket.id} · {selectedTicket.category?.replace(/_/g, ' ')}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedTicket.subject}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    Priority: {selectedTicket.priority || 'MEDIUM'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Opened {new Date(selectedTicket.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Initial description */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-mono font-semibold text-slate-400 uppercase">
                  Original Issue Description
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Replies Thread */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Discussion ({selectedTicket.replies?.length || 0})</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {(!selectedTicket.replies || selectedTicket.replies.length === 0) ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                      Awaiting response from platform operations engineer.
                    </div>
                  ) : (
                    selectedTicket.replies.map((r: any, idx: number) => (
                      <div
                        key={r.id || idx}
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          r.is_admin
                            ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100'
                            : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="font-bold flex items-center gap-1">
                            {r.is_admin ? <Shield className="w-3 h-3 text-blue-600" /> : <User className="w-3 h-3" />}
                            {r.author || (r.is_admin ? 'Master Admin' : 'You')}
                          </span>
                          <span className="text-slate-400">
                            {r.created_at ? new Date(r.created_at).toLocaleTimeString() : ''}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-[11px]">
                          {r.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleReplySubmit} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <textarea
                  rows={2}
                  placeholder="Type your response to support..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={!(replyMessage || '').trim() || replying}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{replying ? 'Sending...' : 'Send Reply'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 space-y-2">
              <LifeBuoy className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <div className="font-semibold text-slate-600 dark:text-slate-400">Select a Ticket</div>
              <p className="text-[11px]">
                Click on any ticket in the list to inspect resolution status, administrative feedback, and correspondence.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create New Support Request
                </h3>
                <p className="text-xs text-slate-500">
                  Enterprise ML engineer ticket queue
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="TECHNICAL_SUPPORT">Technical Support</option>
                    <option value="PIPELINE_ERROR">Pipeline / Self-Healing Error</option>
                    <option value="MODEL_TRAINING">Model Training & Convergence</option>
                    <option value="DATASET_INGESTION">Dataset Ingestion & Schema</option>
                    <option value="ACCOUNT_BILLING">Account & Quotas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="LOW">Low - General Inquiry</option>
                    <option value="MEDIUM">Medium - Normal Operations</option>
                    <option value="HIGH">High - Degraded Workflow</option>
                    <option value="CRITICAL">Critical - Pipeline Blocked</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of the issue..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe exact error messages, dataset ID, or training run ID affected..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
