const fs = require('fs');

let shop = fs.readFileSync('public/shop.html', 'utf8');

// Update body tag classes
shop = shop.replace(
  '<body class="bg-slate-50 text-slate-900 min-h-screen flex flex-col justify-between p-3.5 sm:p-6 antialiased selection:bg-slate-900 selection:text-white">',
  '<body class="bg-[#0b0b0d] text-white min-h-screen flex flex-col justify-between p-3.5 sm:p-6 antialiased selection:bg-[#d99b3b] selection:text-black">'
);

// Update header
shop = shop.replace(
  '<header class="w-full max-w-md mx-auto flex items-center justify-between pb-2">',
  `<header class="w-full max-w-md mx-auto flex items-center justify-between pb-2">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#cb8926] to-[#e5a83b] flex items-center justify-center font-bold text-black text-sm shadow-md shadow-[#d99b3b]/20">M</div>
      <div>
        <div class="flex items-center gap-1.5">
          <span class="font-extrabold text-sm text-white tracking-tight">Mark<span class="text-[#d99b3b]">U</span></span>
          <span class="text-[10px] text-zinc-400 font-medium">Terminal</span>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#d99b3b] bg-[#d99b3b]/10 border border-[#d99b3b]/30 px-2.5 py-0.5 rounded-full">
      <span class="w-2 h-2 rounded-full bg-[#d99b3b] animate-pulse"></span>
      <span>Live Terminal</span>
    </div>
  </header>`
);

// Remove the old header content if it duplicated
shop = shop.replace(
  `<header class="w-full max-w-md mx-auto flex items-center justify-between pb-2">
    <div class="flex items-center gap-2">
      <span class="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">M</span>
      <span class="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">MarkU Counter Terminal</span>
    </div>
    <div class="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>Live Checkout</span>
    </div>
  </header>`,
  `<header class="w-full max-w-md mx-auto flex items-center justify-between pb-2">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#cb8926] to-[#e5a83b] flex items-center justify-center font-bold text-black text-sm shadow-md shadow-[#d99b3b]/20">M</div>
      <div class="flex items-center gap-1.5">
        <span class="font-extrabold text-sm text-white tracking-tight">Mark<span class="text-[#d99b3b]">U</span></span>
        <span class="text-[10px] text-zinc-400 font-medium">Counter Terminal</span>
      </div>
    </div>
    <div class="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#d99b3b] bg-[#d99b3b]/10 border border-[#d99b3b]/30 px-2.5 py-0.5 rounded-full">
      <span class="w-2 h-2 rounded-full bg-[#d99b3b] animate-pulse"></span>
      <span>Live Checkout</span>
    </div>
  </header>`
);

// Replace section container
shop = shop.replace(
  'class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"',
  'class="bg-[#141417] border border-[#232328] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden"'
);

// Shop avatar & title
shop = shop.replace(
  'id="shopAvatar" class="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold text-base flex items-center justify-center shrink-0 border border-slate-800 shadow-xs"',
  'id="shopAvatar" class="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#cb8926] to-[#e5a83b] text-black font-extrabold text-lg flex items-center justify-center shrink-0 shadow-md shadow-[#d99b3b]/20"'
);

shop = shop.replace(
  'id="shopTitle" class="text-base sm:text-lg font-bold text-gray-900 truncate"',
  'id="shopTitle" class="text-base sm:text-lg font-bold text-white tracking-tight truncate"'
);

shop = shop.replace(
  'class="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg uppercase tracking-wider"',
  'class="text-[10px] font-mono font-bold text-[#d99b3b] bg-[#d99b3b]/10 border border-[#d99b3b]/30 px-2.5 py-1 rounded-lg uppercase tracking-wider"'
);

// Reward highlight banner
shop = shop.replace(
  'class="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-center gap-3"',
  'class="bg-gradient-to-r from-[#1c170d] to-[#161619] border border-[#d99b3b]/30 rounded-xl p-3 flex items-center gap-3"'
);

shop = shop.replace(
  'class="w-9 h-9 rounded-lg bg-white border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs shrink-0"',
  'class="w-9 h-9 rounded-lg bg-[#d99b3b]/15 border border-[#d99b3b]/40 text-[#d99b3b] flex items-center justify-center shrink-0"'
);

shop = shop.replace(
  'class="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block"',
  'class="text-[10px] uppercase font-bold text-[#d99b3b] tracking-wider block"'
);

shop = shop.replace(
  'id="shopRewardSub" class="text-xs sm:text-sm font-bold text-gray-900 truncate"',
  'id="shopRewardSub" class="text-xs sm:text-sm font-bold text-zinc-100 truncate"'
);

// QR Box wrapper
shop = shop.replace(
  'class="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col items-center space-y-3.5"',
  'class="bg-[#0e0e11] border border-[#232328] rounded-xl p-4 sm:p-5 flex flex-col items-center space-y-3.5"'
);

shop = shop.replace(
  'class="text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center"',
  'class="text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center"'
);

shop = shop.replace(
  'id="qrContainer" class="qr-box w-56 h-56 sm:w-64 sm:h-64 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center"',
  'id="qrContainer" class="qr-box w-56 h-56 sm:w-64 sm:h-64 bg-white p-3.5 rounded-2xl border-2 border-[#d99b3b]/40 shadow-xl shadow-[#d99b3b]/10 flex items-center justify-center"'
);

shop = shop.replace(
  'class="h-full bg-slate-900 transition-all duration-1000 ease-linear w-full"',
  'class="h-full bg-gradient-to-r from-[#cb8926] to-[#f5b041] transition-all duration-1000 ease-linear w-full"'
);

// Step boxes
shop = shop.replace(
  /class="bg-slate-50 rounded-lg p-2 border border-slate-200\/70"/g,
  'class="bg-[#18181c] rounded-xl p-2.5 border border-[#232328]"'
);

shop = shop.replace(
  /class="font-bold text-gray-800 block text-xs"/g,
  'class="font-bold text-[#d99b3b] block text-xs"'
);

// Footer
shop = shop.replace(
  'class="w-full max-w-md mx-auto flex justify-between items-center text-xs text-gray-400 pt-3"',
  'class="w-full max-w-md mx-auto flex justify-between items-center text-xs text-zinc-500 pt-3"'
);

shop = shop.replace(
  'class="text-indigo-600 font-bold hover:underline flex items-center gap-1"',
  'class="text-[#d99b3b] font-bold hover:underline flex items-center gap-1"'
);

fs.writeFileSync('public/shop.html', shop, 'utf8');
console.log('shop.html successfully restyled to luxury dark gold theme');
