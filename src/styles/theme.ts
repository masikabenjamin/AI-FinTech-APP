// Premium Fintech Visual Constants and Guidelines — Bento Grid Theme Edition
export const DESIGN_TOKENS = {
  // Rich light theme emphasizing structured grid cells, curved borders, and elegant indigo hints
  themeName: 'Bento Grid Corporate Wealth Console',
  colors: {
    bg: 'bg-slate-50',
    card: 'bg-white border text-slate-800 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl',
    brand: 'text-indigo-600 font-semibold',
    accent: 'bg-indigo-600 text-white hover:bg-indigo-500 transition-all duration-150 rounded-2xl',
    success: {
      text: 'text-emerald-700',
      bg: 'bg-emerald-50 border border-emerald-200',
      dot: 'bg-emerald-500'
    },
    warning: {
      text: 'text-amber-700',
      bg: 'bg-amber-50 border border-amber-200',
      dot: 'bg-amber-500'
    },
    danger: {
      text: 'text-rose-700',
      bg: 'bg-rose-50 border border-rose-200',
      dot: 'bg-rose-500'
    },
    info: {
      text: 'text-indigo-700',
      bg: 'bg-indigo-50 border border-indigo-200',
      dot: 'bg-indigo-500'
    }
  },
  typography: {
    heading: 'font-sans font-extrabold tracking-tight text-slate-900',
    mono: 'font-mono text-xs font-semibold tracking-normal text-slate-500',
    subHeader: 'text-xs font-bold text-slate-400 uppercase tracking-wider'
  },
  banner: {
    text: 'Sandbox prototype - no real money movement.',
    supportDetail: 'All registered credit limits and accounts are simulated. Do not enter production bank secrets.'
  }
};
