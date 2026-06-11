import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Settings,
  X, Send, CheckCircle2, AlertCircle, Loader2, Wallet, Users, Lock, RotateCcw, Receipt, History,
} from 'lucide-react';
import HistoricoView from './HistoricoView.jsx';

const STORAGE_KEYS = {
  RESIDENTS: 'cartaoCasa_residents',
  EXPENSES: 'cartaoCasa_expenses',
  SETTINGS: 'cartaoCasa_settings',
  INVOICE: 'cartaoCasa_invoice',
  MESSAGES: 'cartaoCasa_messages',
};

const DEFAULT_RESIDENTS = [
  { nome: 'ANDRE', telefone: '', apikey: '' },
  { nome: 'KARINE', telefone: '', apikey: '' },
  { nome: 'GABY', telefone: '', apikey: '' },
  { nome: 'CAMILA', telefone: '', apikey: '' },
  { nome: 'KAUANE', telefone: '', apikey: '' },
  { nome: 'ZELIA', telefone: '', apikey: '' },
  { nome: 'JHOW', telefone: '', apikey: '' },
  { nome: 'VINI', telefone: '', apikey: '' },
];

const DEFAULT_SETTINGS = {
  pixKey: '',
};

const CALLMEBOT_URL = 'https://api.callmebot.com/whatsapp.php';

const DEFAULT_INVOICE = {
  closed: false,
  closedAt: null,
  total: 0,
  perPerson: 0,
  sendStatus: 'idle', // idle | sending | success | error
  sendError: null,
};

const inputClass =
  'w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400';

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function formatBRL(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

function getCurrentMonthLabel() {
  const str = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function buildIndividualMessage(nome, total, perPerson, pixKey) {
  const lines = [
    `Olá, *${nome}*! 🚨`,
    '*Fechamento da fatura do Cartão da Casa*',
    `Total do Cartão: ${formatBRL(total)}`,
    `Sua parte: *${formatBRL(perPerson)}*`,
  ];
  lines.push(
    pixKey
      ? `Por favor, realize o pix para *${pixKey}*.`
      : 'Por favor, realize o pagamento da sua parte.'
  );
  return lines.join('\n');
}

function SendStatusBanner({ status, error }) {
  if (status === 'sending') {
    return (
      <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2">
        <Loader2 size={16} className="animate-spin" /> Enviando para o WhatsApp...
      </div>
    );
  }
  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
        <CheckCircle2 size={16} /> Mensagens enviadas! Confira o WhatsApp de cada morador.
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Erro ao enviar</p>
          {error && <p className="text-xs text-rose-500 mt-0.5">{error}</p>}
        </div>
      </div>
    );
  }
  return null;
}

export default function App() {
  const [residents, setResidents] = useState(() => {
    const loaded = loadFromStorage(STORAGE_KEYS.RESIDENTS, DEFAULT_RESIDENTS);
    return loaded.map((r) =>
      typeof r === 'string' ? { nome: r, telefone: '', apikey: '' } : { apikey: '', ...r }
    );
  });
  const [expenses, setExpenses] = useState(() => loadFromStorage(STORAGE_KEYS.EXPENSES, []));
  const [settings, setSettings] = useState(() => loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS));
  const [invoice, setInvoice] = useState(() => loadFromStorage(STORAGE_KEYS.INVOICE, DEFAULT_INVOICE));
  const [messages, setMessages] = useState(() => loadFromStorage(STORAGE_KEYS.MESSAGES, []));

  const [form, setForm] = useState({
    comprador: residents[0]?.nome || '',
    valor: '',
    descricao: '',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState('dashboard'); // dashboard | historico
  const [newResident, setNewResident] = useState('');
  const [newResidentPhone, setNewResidentPhone] = useState('');
  const [newResidentApiKey, setNewResidentApiKey] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(residents));
  }, [residents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICE, JSON.stringify(invoice));
  }, [invoice]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  const compradorAtual = residents.some((r) => r.nome === form.comprador)
    ? form.comprador
    : residents[0]?.nome || '';

  const total = useMemo(() => expenses.reduce((sum, e) => sum + e.valor, 0), [expenses]);

  const totalsByPerson = useMemo(() => {
    const map = {};
    residents.forEach((r) => (map[r.nome] = 0));
    expenses.forEach((e) => {
      map[e.comprador] = (map[e.comprador] || 0) + e.valor;
    });
    return map;
  }, [expenses, residents]);

  const valorNumerico = parseFloat((form.valor || '').replace(',', '.'));
  const isFormValid =
    !invoice.closed && compradorAtual && form.descricao.trim().length > 0 && valorNumerico > 0;

  function handleAddExpense(e) {
    e.preventDefault();
    if (!isFormValid) return;
    const newExpense = {
      id: crypto.randomUUID(),
      comprador: compradorAtual,
      valor: valorNumerico,
      descricao: form.descricao.trim(),
      data: new Date().toISOString(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
    setForm((f) => ({ ...f, valor: '', descricao: '' }));
  }

  function handleDeleteExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function handleAddResident() {
    const name = newResident.trim();
    if (!name || residents.some((r) => r.nome === name)) return;
    setResidents((prev) => [
      ...prev,
      { nome: name, telefone: newResidentPhone.trim(), apikey: newResidentApiKey.trim() },
    ]);
    setNewResident('');
    setNewResidentPhone('');
    setNewResidentApiKey('');
  }

  function handleRemoveResident(name) {
    setResidents((prev) => prev.filter((r) => r.nome !== name));
  }

  function handleUpdateResidentPhone(name, telefone) {
    setResidents((prev) => prev.map((r) => (r.nome === name ? { ...r, telefone } : r)));
  }

  function handleUpdateResidentApiKey(name, apikey) {
    setResidents((prev) => prev.map((r) => (r.nome === name ? { ...r, apikey } : r)));
  }

  async function sendCallMeBotMessage(resident, text) {
    const url = `${CALLMEBOT_URL}?phone=${encodeURIComponent(resident.telefone.trim())}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(resident.apikey.trim())}`;
    let status = 'enviado';
    try {
      // O CallMeBot não envia cabeçalhos CORS, então usamos "no-cors":
      // a mensagem é entregue normalmente, mas a resposta não pode ser lida.
      await fetch(url, { mode: 'no-cors' });
    } catch {
      status = 'erro';
    }
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), residente: resident.nome, texto: text, data: new Date().toISOString(), status },
    ]);
    return status;
  }

  async function sendAdHocMessage(residentName, text) {
    const resident = residents.find((r) => r.nome === residentName);
    if (!resident || !resident.telefone.trim() || !resident.apikey.trim()) return 'erro';
    return sendCallMeBotMessage(resident, text);
  }

  async function sendInvoiceMessage(totalValue, perPersonValue) {
    setInvoice((prev) => ({ ...prev, sendStatus: 'sending', sendError: null }));

    const recipients = residents.filter((r) => r.telefone.trim() && r.apikey.trim());
    if (recipients.length === 0) {
      setInvoice((prev) => ({
        ...prev,
        sendStatus: 'error',
        sendError: 'Nenhum morador com WhatsApp e chave do CallMeBot cadastrados.',
      }));
      return;
    }

    const failed = [];
    for (const r of recipients) {
      const message = buildIndividualMessage(r.nome, totalValue, perPersonValue, settings.pixKey);
      const status = await sendCallMeBotMessage(r, message);
      if (status === 'erro') failed.push(r.nome);
      // Pequena pausa entre envios para não sobrecarregar o CallMeBot.
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (failed.length === 0) {
      setInvoice((prev) => ({ ...prev, sendStatus: 'success' }));
    } else {
      setInvoice((prev) => ({
        ...prev,
        sendStatus: 'error',
        sendError: `Falha ao enviar para: ${failed.join(', ')}`,
      }));
    }
  }

  async function handleCloseInvoice() {
    if (expenses.length === 0 || residents.length === 0) return;
    if (!window.confirm('Fechar a fatura e enviar a cobrança individual para cada morador no WhatsApp?')) return;

    const totalValue = total;
    const perPersonValue = totalValue / residents.length;

    setInvoice({
      closed: true,
      closedAt: new Date().toISOString(),
      total: totalValue,
      perPerson: perPersonValue,
      sendStatus: 'idle',
      sendError: null,
    });

    await sendInvoiceMessage(totalValue, perPersonValue);
  }

  function handleRetrySend() {
    sendInvoiceMessage(invoice.total, invoice.perPerson);
  }

  function handleNewInvoice() {
    if (!window.confirm('Iniciar uma nova fatura? Os lançamentos atuais serão apagados.')) return;
    setExpenses([]);
    setInvoice(DEFAULT_INVOICE);
  }

  const canClose = !invoice.closed && expenses.length > 0 && residents.length > 0;

  if (view === 'historico') {
    return (
      <HistoricoView
        residents={residents}
        messages={messages}
        onSendMessage={sendAdHocMessage}
        onBack={() => setView('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">Cartão da Casa</h1>
            <p className="text-xs text-slate-400">{getCurrentMonthLabel()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('historico')}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Histórico de cobranças"
          >
            <History size={22} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Configurações"
          >
            <Settings size={22} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Resumo Financeiro */}
        <section className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl p-5 shadow-lg">
          <p className="text-indigo-100 text-sm">Total da Fatura</p>
          <p className="text-3xl font-bold mt-1">{formatBRL(total)}</p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {residents.map((r) => (
              <div key={r.nome} className="bg-white/10 rounded-lg px-3 py-2">
                <p className="text-xs text-indigo-100 truncate">{r.nome}</p>
                <p className="font-semibold">{formatBRL(totalsByPerson[r.nome] || 0)}</p>
              </div>
            ))}
            {residents.length === 0 && (
              <p className="col-span-2 sm:col-span-3 text-sm text-indigo-100">
                Nenhum morador cadastrado. Adicione em Configurações.
              </p>
            )}
          </div>
        </section>

        {/* Fatura Fechada */}
        {invoice.closed && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <Lock size={18} /> Fatura Fechada
            </div>
            <p className="text-sm text-slate-500">Fechada em {formatDateTime(invoice.closedAt)}</p>

            <div className="bg-slate-50 rounded-xl p-3 space-y-1">
              <p className="text-sm text-slate-500">
                Total: <span className="font-bold text-slate-800">{formatBRL(invoice.total)}</span>
              </p>
              <p className="text-sm text-slate-500">
                Cada um paga:{' '}
                <span className="font-bold text-slate-800">{formatBRL(invoice.perPerson)}</span>
              </p>
            </div>

            <SendStatusBanner status={invoice.sendStatus} error={invoice.sendError} />

            {invoice.sendStatus === 'error' && (
              <button
                onClick={handleRetrySend}
                className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
              >
                <Send size={16} /> Tentar Enviar Novamente
              </button>
            )}

            <button
              onClick={handleNewInvoice}
              className="w-full border border-slate-200 text-slate-600 rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={16} /> Iniciar Nova Fatura
            </button>
          </section>
        )}

        {/* Painel de Lançamento */}
        <form
          onSubmit={handleAddExpense}
          className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3 ${invoice.closed ? 'opacity-60' : ''}`}
        >
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Plus size={18} /> Novo Lançamento
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-slate-500">Comprador</label>
              <select
                value={compradorAtual}
                onChange={(e) => setForm((f) => ({ ...f, comprador: e.target.value }))}
                disabled={invoice.closed || residents.length === 0}
                className={inputClass}
              >
                {residents.map((r) => (
                  <option key={r.nome} value={r.nome}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-slate-500">Valor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                disabled={invoice.closed}
                className={inputClass}
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500">Descrição</label>
              <input
                type="text"
                placeholder="Ex: Compras da semana"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                disabled={invoice.closed}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormValid}
            className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={18} /> Adicionar Gasto
          </button>
        </form>

        {/* Lista de Lançamentos */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Receipt size={18} /> Lançamentos do Mês
            </h2>
            <span className="text-xs text-slate-400">{expenses.length} itens</span>
          </div>

          {expenses.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8 px-4">Nenhum gasto lançado ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {expenses.map((exp) => {
                return (
                  <li key={exp.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 text-sm truncate">{exp.descricao}</p>
                      <p className="text-xs text-slate-400">
                        {exp.comprador} · {formatDate(exp.data)}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-700 text-sm whitespace-nowrap">{formatBRL(exp.valor)}</p>
                    {!invoice.closed && (
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                        aria-label="Excluir lançamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Botão de Fechamento */}
        {!invoice.closed && (
          <button
            onClick={handleCloseInvoice}
            disabled={!canClose}
            className="w-full bg-rose-600 text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-200 hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Lock size={18} /> Fechar Fatura e Enviar Resumo
          </button>
        )}
      </main>

      {/* Modal de Configurações */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/40 z-20 flex items-end sm:items-center justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-800">Configurações</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>

            {/* Moradores */}
            <div>
              <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
                <Users size={16} /> Moradores da Casa
              </h3>
              <p className="text-xs text-slate-400 mb-2">
                Para cada morador, cadastre o WhatsApp e a chave do{' '}
                <a
                  href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 underline"
                >
                  CallMeBot
                </a>
                .
              </p>
              <div className="space-y-2 mb-2">
                {residents.map((r) => (
                  <div key={r.nome} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{r.nome}</span>
                      <button
                        onClick={() => handleRemoveResident(r.nome)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        aria-label={`Remover ${r.nome}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={r.telefone}
                        onChange={(e) => handleUpdateResidentPhone(r.nome, e.target.value)}
                        placeholder="WhatsApp: 5511999999999"
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={r.apikey}
                        onChange={(e) => handleUpdateResidentApiKey(r.nome, e.target.value)}
                        placeholder="Chave do CallMeBot"
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ))}
                {residents.length === 0 && <p className="text-sm text-slate-400">Nenhum morador cadastrado.</p>}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newResident}
                  onChange={(e) => setNewResident(e.target.value)}
                  placeholder="Nome do morador"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newResidentPhone}
                    onChange={(e) => setNewResidentPhone(e.target.value)}
                    placeholder="WhatsApp: 5511999999999"
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={newResidentApiKey}
                    onChange={(e) => setNewResidentApiKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddResident();
                      }
                    }}
                    placeholder="Chave do CallMeBot"
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddResident}
                    className="bg-indigo-600 text-white rounded-xl px-3 hover:bg-indigo-700 transition-colors"
                    aria-label="Adicionar morador"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Pix */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Send size={16} /> Pagamento
              </h3>

              <div>
                <label className="text-xs font-medium text-slate-500">Chave Pix (para o resumo)</label>
                <input
                  type="text"
                  value={settings.pixKey}
                  onChange={(e) => setSettings((s) => ({ ...s, pixKey: e.target.value }))}
                  placeholder="Ex: email@exemplo.com"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition-colors"
            >
              Salvar e Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
