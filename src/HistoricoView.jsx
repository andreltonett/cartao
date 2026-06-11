import { useMemo, useState } from 'react';
import {
  ArrowLeft, Search, Send, Smile, Paperclip, Mic, CheckCheck, AlertCircle, MessageSquare,
} from 'lucide-react';

const AVATAR_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#22d3ee', '#818cf8', '#c084fc', '#f472b6'];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatBubbleTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatListTime(iso) {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function Avatar({ name, size = 48 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ backgroundColor: avatarColor(name), width: size, height: size, fontSize: size / 2.4 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function HistoricoView({ residents, messages, onSendMessage, onBack }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const lastMessageByResident = useMemo(() => {
    const map = {};
    messages.forEach((m) => {
      if (!map[m.residente] || new Date(m.data) > new Date(map[m.residente].data)) {
        map[m.residente] = m;
      }
    });
    return map;
  }, [messages]);

  const filteredResidents = useMemo(
    () => residents.filter((r) => r.nome.toLowerCase().includes(search.trim().toLowerCase())),
    [residents, search]
  );

  const chatMessages = useMemo(
    () =>
      messages
        .filter((m) => m.residente === selected)
        .sort((a, b) => new Date(a.data) - new Date(b.data)),
    [messages, selected]
  );

  const selectedResident = residents.find((r) => r.nome === selected);
  const canSend = !!(selectedResident?.telefone.trim() && selectedResident?.apikey.trim());

  async function handleSend() {
    const text = draft.trim();
    if (!text || !canSend || sending) return;
    setSending(true);
    setDraft('');
    await onSendMessage(selected, text);
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-30 flex bg-[#0b141a] text-white">
      {/* Sidebar */}
      <div className={`w-full sm:w-[35%] sm:min-w-[300px] sm:max-w-[420px] flex-col bg-[#111b21] border-r border-black/30 ${selected ? 'hidden sm:flex' : 'flex'}`}>
        <header className="bg-[#111b21] px-4 py-3 flex items-center gap-3 border-b border-black/20">
          <button onClick={onBack} className="text-[#aebac1] hover:text-white transition-colors" aria-label="Voltar">
            <ArrowLeft size={22} />
          </button>
          <h2 className="text-lg font-semibold">Histórico de Cobranças</h2>
        </header>

        <div className="px-3 py-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar morador"
              className="w-full bg-[#202c33] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#8696a0] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredResidents.map((r) => {
            const lastMsg = lastMessageByResident[r.nome];
            return (
              <button
                key={r.nome}
                onClick={() => setSelected(r.nome)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/5 transition-colors border-b border-black/10 ${selected === r.nome ? 'bg-white/10' : ''}`}
              >
                <Avatar name={r.nome} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{r.nome}</span>
                    {lastMsg && (
                      <span className="text-xs text-[#8696a0] flex-shrink-0">{formatListTime(lastMsg.data)}</span>
                    )}
                  </div>
                  <p className="text-sm text-[#8696a0] truncate">
                    {lastMsg ? lastMsg.texto.split('\n')[0] : 'Nenhuma mensagem enviada'}
                  </p>
                </div>
              </button>
            );
          })}
          {filteredResidents.length === 0 && (
            <p className="text-center text-sm text-[#8696a0] px-4 py-8">Nenhum morador encontrado.</p>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className={`flex-1 flex-col bg-[#0b141a] ${selected ? 'flex' : 'hidden sm:flex'}`}>
        {selectedResident ? (
          <>
            <header className="bg-[#202c33] px-4 py-3 flex items-center gap-3 border-b border-black/20">
              <button onClick={() => setSelected(null)} className="sm:hidden text-[#aebac1] hover:text-white" aria-label="Voltar">
                <ArrowLeft size={22} />
              </button>
              <Avatar name={selectedResident.nome} size={40} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedResident.nome}</p>
                <p className="text-xs text-[#8696a0] truncate">{selectedResident.telefone || 'WhatsApp não configurado'}</p>
              </div>
            </header>

            {chatMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[#8696a0] text-sm text-center px-6">
                Nenhuma mensagem enviada para {selectedResident.nome} ainda.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[75%] sm:max-w-[60%] bg-[#005c4b] rounded-lg rounded-tr-none px-3 py-2 shadow">
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.texto}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[11px] text-white/60">{formatBubbleTime(msg.data)}</span>
                        {msg.status === 'erro' ? (
                          <AlertCircle size={14} className="text-rose-300" />
                        ) : (
                          <CheckCheck size={14} className="text-sky-300" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!canSend && (
              <p className="text-xs text-[#8696a0] text-center px-4 py-1 bg-[#202c33]">
                Configure o WhatsApp e a chave do CallMeBot deste morador em Configurações para enviar mensagens.
              </p>
            )}

            <footer className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
              <button type="button" className="text-[#8696a0] hover:text-white transition-colors" aria-label="Anexar">
                <Paperclip size={22} />
              </button>
              <button type="button" className="text-[#8696a0] hover:text-white transition-colors" aria-label="Emoji">
                <Smile size={22} />
              </button>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Digite uma mensagem"
                disabled={!canSend || sending}
                className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-sm text-white placeholder-[#8696a0] focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend || sending || !draft.trim()}
                className="text-[#8696a0] hover:text-white transition-colors disabled:opacity-30"
                aria-label="Enviar"
              >
                {draft.trim() ? <Send size={22} /> : <Mic size={22} />}
              </button>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0]">
            <MessageSquare size={64} className="mb-4 opacity-30" />
            <p className="text-sm">Selecione um morador para ver o histórico</p>
          </div>
        )}
      </div>
    </div>
  );
}
