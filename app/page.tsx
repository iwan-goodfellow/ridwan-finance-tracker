"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PlusCircle, Wallet, TrendingDown, TrendingUp, Calendar as CalIcon, ChevronLeft, ChevronRight, FileText, X, Trash2, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type TransactionType = 'Income' | 'Expense';
type Transaction = {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string;
  user_id?: string;
};

const EXPENSE_CATEGORIES = ['🍱 Food', '🏠 House', '🏃 Exercise', '📚 Education', '🤲 Shodaqoh', '💻 Office'];
const INCOME_CATEGORIES = ['💼 Salary', '🚀 Project', '🎁 Bonus'];

export default function VintageFinanceTracker() {
  // AUTH STATE
  const [session, setSession] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // APP STATE
  const [viewDate, setViewDate] = useState(new Date()); 
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // FORM STATE
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TransactionType>('Expense');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // CEK SESI LOGIN
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchTransactions();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchTransactions();
    });

    return () => subscription.unsubscribe();
  }, []);

  // AUTH HANDLERS
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    let error;

    if (isLoginMode) {
      const res = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      error = res.error;
    } else {
      const res = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      error = res.error;
      if (!error) alert('Check your email for the confirmation link!');
    }

    if (error) alert(error.message);
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTransactions([]);
  };

  // FETCH DATA
  const fetchTransactions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) setTransactions(data as Transaction[]);
    setIsLoading(false);
  };

  // ADD DATA
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !session) return;
    
    const newTx = {
      type, category, description, amount: Number(amount), date, user_id: session.user.id
    };
    
    const { data, error } = await supabase.from('transactions').insert([newTx]).select();

    if (error) {
      alert('Failed to save transaction!');
    } else if (data) {
      setTransactions([...transactions, data[0] as Transaction]);
      setAmount('');
      setDescription('');
    }
  };

  // DELETE DATA
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setTransactions(transactions.filter(t => t.id !== id));
    } else {
      alert('Failed to delete transaction!');
    }
  };

  // BASE CALCULATIONS
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === viewDate.getMonth() && tDate.getFullYear() === viewDate.getFullYear();
    });
  }, [transactions, viewDate]);

  const { totalIncome, totalExpense, totalShodaqoh } = useMemo(() => {
    let inc = 0; let exp = 0; let shod = 0;
    currentMonthTransactions.forEach((t) => {
      if (t.type === 'Income') inc += t.amount;
      else {
        exp += t.amount;
        if (t.category === '🤲 Shodaqoh') shod += t.amount;
      }
    });
    return { totalIncome: inc, totalExpense: exp, totalShodaqoh: shod };
  }, [currentMonthTransactions]);

  // NEW: AGGREGATED CALCULATIONS FOR UI LIST
  const aggregatedExpenses = useMemo(() => {
    const expenses = currentMonthTransactions.filter(t => t.type === 'Expense');
    const grouped = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonthTransactions]);

  const aggregatedIncomes = useMemo(() => {
    const incomes = currentMonthTransactions.filter(t => t.type === 'Income');
    const grouped = incomes.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonthTransactions]);

  const remaining = totalIncome - totalExpense;
  const expPercentage = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const shodPercentage = totalIncome > 0 ? (totalShodaqoh / totalIncome) * 100 : 0;
  const saveRate = totalIncome > 0 ? 100 - expPercentage : 0;

  let emoji = '😊';
  let statusText = 'Great! Keep saving.';
  if (totalIncome === 0 && totalExpense === 0) {
    emoji = '😴';
    statusText = 'No data this month.';
  } else if (expPercentage <= 8 || shodPercentage > 8) {
    emoji = '😊';
    statusText = 'Great! Keep saving.';
  } else if (expPercentage > 8 && expPercentage <= 12) {
    emoji = '😐';
    statusText = 'Watch your spending.';
  } else {
    emoji = '☹️';
    statusText = 'Over budget! Be careful.';
  }

  const chartData = [
    { name: 'Expense', value: parseFloat(expPercentage.toFixed(1)) },
    { name: 'Remaining', value: parseFloat(saveRate.toFixed(1)) },
  ];
  const COLORS = ['#df7c6b', '#88aeb2']; 
  const formatRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;
  const monthYearLabel = viewDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  // ---------------- RENDERING ----------------

  const RetroStyles = () => (
    <style dangerouslySetInnerHTML={{__html: `
      @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&family=Pacifico&display=swap');
      .sunburst-bg { background: repeating-conic-gradient(from 0deg, #df7c6b 0deg 15deg, #f4ecd8 15deg 30deg, #88aeb2 30deg 45deg, #f4ecd8 45deg 60deg); }
      .noise-overlay { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
    `}} />
  );

  if (!session) {
    return (
      <div className="min-h-screen sunburst-bg relative font-['Josefin_Sans'] text-[#7a1c4b] p-4 flex justify-center items-center overflow-hidden">
        <RetroStyles />
        <div className="absolute inset-0 noise-overlay pointer-events-none opacity-[0.15] mix-blend-multiply"></div>
        <div className="relative z-10 w-full max-w-md bg-[#f4ecd8] border-4 border-[#7a1c4b] shadow-[12px_12px_0px_#7a1c4b] rounded-2xl p-8 text-center">
          <h1 className="font-['Pacifico'] text-5xl text-[#7a1c4b] drop-shadow-[2px_2px_0px_#f4ecd8] [text-shadow:3px_3px_0px_#df7c6b,5px_5px_0px_#7a1c4b] -rotate-2 mb-8">
            Retroholic
          </h1>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <input type="email" placeholder="Email..." required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="bg-transparent border-2 border-[#7a1c4b] p-3 font-bold focus-within:shadow-[4px_4px_0px_#df7c6b] outline-none" />
            <input type="password" placeholder="Password..." required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="bg-transparent border-2 border-[#7a1c4b] p-3 font-bold focus-within:shadow-[4px_4px_0px_#df7c6b] outline-none" />
            <button type="submit" disabled={authLoading} className="bg-[#df7c6b] text-[#f4ecd8] font-bold uppercase tracking-widest text-lg py-3 border-2 border-[#7a1c4b] shadow-[6px_6px_0px_#7a1c4b] hover:shadow-[2px_2px_0px_#7a1c4b] hover:translate-y-1 hover:translate-x-1 transition-all">
              {authLoading ? 'Processing...' : isLoginMode ? 'Enter System' : 'Create Account'}
            </button>
          </form>
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="mt-6 text-sm font-bold underline hover:text-[#df7c6b]">
            {isLoginMode ? "Need an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <RetroStyles />
      <div className="min-h-screen sunburst-bg relative font-['Josefin_Sans'] text-[#7a1c4b] p-4 md:p-8 flex justify-center items-start overflow-hidden">
        <div className="absolute inset-0 noise-overlay pointer-events-none opacity-[0.15] mix-blend-multiply"></div>

        <div className="relative z-10 w-full max-w-2xl bg-[#f4ecd8] border-4 border-[#7a1c4b] shadow-[12px_12px_0px_#7a1c4b] rounded-2xl p-6 sm:p-10 my-4 md:my-8">
          
          <div className="absolute top-4 right-4">
            <button onClick={handleLogout} className="p-2 border-2 border-[#7a1c4b] hover:bg-[#df7c6b] hover:text-[#f4ecd8] transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center mb-10 flex flex-col items-center">
            <span className="uppercase tracking-[0.3em] text-xs font-bold mb-2">Introducing</span>
            <h1 className="font-['Pacifico'] text-5xl md:text-6xl text-[#7a1c4b] drop-shadow-[3px_3px_0px_#f4ecd8] [text-shadow:4px_4px_0px_#df7c6b,6px_6px_0px_#7a1c4b] -rotate-2 mb-2">
              Retroholic
            </h1>
            
            <div className="flex items-center justify-center gap-6 mt-6 border-y-2 border-[#7a1c4b] py-3 w-full max-w-xs">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="hover:bg-[#df7c6b] hover:text-[#f4ecd8] p-1 rounded transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="uppercase tracking-widest text-sm font-bold w-36 text-center">{monthYearLabel}</span>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="hover:bg-[#df7c6b] hover:text-[#f4ecd8] p-1 rounded transition-colors">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {isLoading ? (
             <div className="text-center py-10 font-bold text-xl animate-pulse">Loading Data...</div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-8 bg-white/40 p-6 rounded-xl border-2 border-[#7a1c4b]">
                <div className="relative w-48 h-48 drop-shadow-xl">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} stroke="#7a1c4b" strokeWidth={2} dataKey="value" startAngle={90} endAngle={-270}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#f4ecd8] border-2 border-[#7a1c4b] p-2 shadow-[4px_4px_0px_#7a1c4b] text-[#7a1c4b] font-bold text-xs uppercase tracking-widest">
                                {payload[0].name} : {payload[0].value}%
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-5xl drop-shadow-md">{emoji}</span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="flex justify-between items-center border-b-2 border-dashed border-[#7a1c4b] pb-2">
                    <span className="uppercase font-bold text-[#88aeb2]">Income</span>
                    <span className="font-bold text-xl">{formatRp(totalIncome)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b-2 border-dashed border-[#7a1c4b] pb-2">
                    <span className="uppercase font-bold text-[#df7c6b]">Expense</span>
                    <span className="font-bold text-xl">{formatRp(totalExpense)}</span>
                  </div>
                  <div className="text-center pt-4 bg-[#f4ecd8] border-2 border-[#7a1c4b] shadow-[4px_4px_0px_#7a1c4b] p-3 rounded-lg -rotate-1">
                    <p className="text-xs uppercase font-bold tracking-wider mb-1">Status</p>
                    <p className="font-['Pacifico'] text-xl text-[#df7c6b]">{statusText}</p>
                  </div>
                </div>
              </div>

              <div className="mb-10 bg-white/40 p-6 rounded-xl border-2 border-[#7a1c4b]">
                <h3 className="uppercase font-bold text-center mb-4 tracking-widest border-b-2 border-[#7a1c4b] pb-2">Add New Record</h3>
                <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <button type="button" onClick={() => { setType('Expense'); setCategory(EXPENSE_CATEGORIES[0]); }} className={`flex-1 py-3 uppercase font-bold flex justify-center items-center gap-2 border-2 border-[#7a1c4b] transition-all ${type === 'Expense' ? 'bg-[#df7c6b] text-[#f4ecd8] shadow-[4px_4px_0px_#7a1c4b] translate-y-0' : 'bg-transparent text-[#7a1c4b] hover:bg-[#df7c6b]/20'}`}>
                      <TrendingDown className="w-5 h-5" /> Expense
                    </button>
                    <button type="button" onClick={() => { setType('Income'); setCategory(INCOME_CATEGORIES[0]); }} className={`flex-1 py-3 uppercase font-bold flex justify-center items-center gap-2 border-2 border-[#7a1c4b] transition-all ${type === 'Income' ? 'bg-[#88aeb2] text-[#f4ecd8] shadow-[4px_4px_0px_#7a1c4b] translate-y-0' : 'bg-transparent text-[#7a1c4b] hover:bg-[#88aeb2]/20'}`}>
                      <TrendingUp className="w-5 h-5" /> Income
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-[#f4ecd8] font-bold border-2 border-[#7a1c4b] p-3 outline-none focus:shadow-[4px_4px_0px_#df7c6b] transition-shadow">
                      {(type === 'Expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    
                    <div className="flex border-2 border-[#7a1c4b] focus-within:shadow-[4px_4px_0px_#df7c6b] transition-shadow bg-[#f4ecd8]">
                      <span className="p-3 border-r-2 border-[#7a1c4b] font-bold bg-[#df7c6b] text-[#f4ecd8]">Rp</span>
                      <input type="number" placeholder="Amount..." value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-transparent font-bold w-full p-3 outline-none" />
                    </div>

                    <div className="flex border-2 border-[#7a1c4b] focus-within:shadow-[4px_4px_0px_#df7c6b] transition-shadow bg-[#f4ecd8] md:col-span-2">
                      <span className="p-3 border-r-2 border-[#7a1c4b] font-bold bg-[#88aeb2] text-[#f4ecd8]">Notes</span>
                      <input type="text" placeholder="Detail (e.g. Beli bebek bakar)..." value={description} onChange={(e) => setDescription(e.target.value)} className="bg-transparent font-bold w-full p-3 outline-none" />
                    </div>

                    <div className="flex border-2 border-[#7a1c4b] focus-within:shadow-[4px_4px_0px_#df7c6b] transition-shadow bg-[#f4ecd8] md:col-span-2">
                      <span className="p-3 border-r-2 border-[#7a1c4b] bg-[#f4ecd8]"><CalIcon className="w-5 h-5" /></span>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent font-bold w-full p-3 outline-none" />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-[#df7c6b] text-[#f4ecd8] font-bold uppercase tracking-widest text-lg py-4 mt-2 border-2 border-[#7a1c4b] shadow-[6px_6px_0px_#7a1c4b] hover:shadow-[2px_2px_0px_#7a1c4b] hover:translate-y-1 hover:translate-x-1 flex justify-center items-center gap-2 transition-all">
                    <PlusCircle className="w-6 h-6" /> Log Transaction
                  </button>
                </form>
              </div>

              {/* LIST AGGREGATION: Removed Trash icon since it's grouped data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-[#f4ecd8] border-2 border-[#7a1c4b] p-4 shadow-[4px_4px_0px_#7a1c4b]">
                  <h3 className="font-['Pacifico'] text-2xl text-[#df7c6b] border-b-2 border-[#7a1c4b] pb-2 mb-4 text-center">Expenses</h3>
                  <div className="space-y-3 font-bold">
                    {aggregatedExpenses.length === 0 && <div className="text-center text-sm opacity-60">No expenses logged.</div>}
                    {aggregatedExpenses.map(t => (
                      <div key={t.category} className="flex justify-between items-center text-sm relative">
                        <span className="w-24 truncate">{t.category}</span>
                        <span className="flex-1 border-b-2 border-dotted border-[#7a1c4b]/30 mx-2"></span>
                        <span className="text-[#df7c6b]">{formatRp(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#f4ecd8] border-2 border-[#7a1c4b] p-4 shadow-[4px_4px_0px_#7a1c4b]">
                  <h3 className="font-['Pacifico'] text-2xl text-[#88aeb2] border-b-2 border-[#7a1c4b] pb-2 mb-4 text-center">Incomes</h3>
                  <div className="space-y-3 font-bold">
                    {aggregatedIncomes.length === 0 && <div className="text-center text-sm opacity-60">No incomes logged.</div>}
                    {aggregatedIncomes.map(t => (
                      <div key={t.category} className="flex justify-between items-center text-sm relative">
                        <span className="w-24 truncate">{t.category}</span>
                        <span className="flex-1 border-b-2 border-dotted border-[#7a1c4b]/30 mx-2"></span>
                        <span className="text-[#88aeb2]">{formatRp(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#f4ecd8] border-2 border-[#7a1c4b] border-dashed p-3 font-bold uppercase tracking-widest text-[#7a1c4b] hover:bg-[#7a1c4b] hover:text-[#f4ecd8] transition-colors"
              >
                <FileText className="w-5 h-5" /> View Raw Table
              </button>
            </>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#7a1c4b]/80 backdrop-blur-sm">
            <div className="bg-[#f4ecd8] border-4 border-[#7a1c4b] shadow-[8px_8px_0px_#000] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col relative overflow-hidden">
              <div className="bg-[#7a1c4b] text-[#f4ecd8] p-4 flex justify-between items-center border-b-4 border-black">
                <h2 className="font-['Pacifico'] text-2xl tracking-wide flex items-center gap-2">
                  <FileText /> Raw Transactions - {monthYearLabel}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="hover:bg-red-500 p-1 rounded-full border-2 border-transparent hover:border-black transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-auto font-mono text-sm bg-white/50 noise-overlay">
                <table className="w-full text-left border-collapse border-2 border-[#7a1c4b]">
                  <thead>
                    <tr className="bg-[#df7c6b] text-[#f4ecd8] uppercase tracking-wider">
                      <th className="border-2 border-[#7a1c4b] p-3">Date</th>
                      <th className="border-2 border-[#7a1c4b] p-3">Type</th>
                      <th className="border-2 border-[#7a1c4b] p-3">Category</th>
                      <th className="border-2 border-[#7a1c4b] p-3">Description</th>
                      <th className="border-2 border-[#7a1c4b] p-3 text-right">Amount</th>
                      <th className="border-2 border-[#7a1c4b] p-3 text-center">Act</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#f4ecd8] font-bold">
                    {currentMonthTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-6 border-2 border-[#7a1c4b] text-gray-500">No data found for this month.</td>
                      </tr>
                    ) : (
                      currentMonthTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#88aeb2]/20 transition-colors">
                          <td className="border-2 border-[#7a1c4b] p-3 whitespace-nowrap">{tx.date}</td>
                          <td className="border-2 border-[#7a1c4b] p-3"><span className={tx.type === 'Income' ? 'text-[#88aeb2]' : 'text-[#df7c6b]'}>{tx.type}</span></td>
                          <td className="border-2 border-[#7a1c4b] p-3">{tx.category}</td>
                          <td className="border-2 border-[#7a1c4b] p-3 font-normal opacity-80">{tx.description || '-'}</td>
                          <td className={`border-2 border-[#7a1c4b] p-3 text-right ${tx.type === 'Income' ? 'text-[#88aeb2]' : 'text-[#df7c6b]'}`}>{formatRp(tx.amount)}</td>
                          <td className="border-2 border-[#7a1c4b] p-3 text-center">
                            <button onClick={() => handleDelete(tx.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}