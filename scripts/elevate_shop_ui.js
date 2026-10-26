const fs = require('fs');
const path = require('path');

const shopPath = path.join(__dirname, '..', 'public', 'shop.html');
let content = fs.readFileSync(shopPath, 'utf8');

// 1. Head fonts
const fontImports = `  <!-- Typography: Plus Jakarta Sans & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { 
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
      -webkit-tap-highlight-color: transparent;
      -webkit-font-smoothing: antialiased;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .qr-box svg {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
  </style>`;

content = content.replace(
  /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>[\s\S]*?<\/style>/,
  fontImports
);

// 2. Body styling
content = content.replace(
  `class="bg-gray-100 text-gray-900 min-h-screen flex flex-col justify-between p-3.5 sm:p-6 antialiased"`,
  `class="bg-slate-50 text-slate-900 min-h-screen flex flex-col justify-between p-3.5 sm:p-6 antialiased selection:bg-slate-900 selection:text-white"`
);

// 3. Header
content = content.replace(
  `<span class="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">M</span>`,
  `<span class="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">M</span>`
);

content = content.replace(
  `<span class="font-bold text-xs sm:text-sm text-gray-900 tracking-tight">MarkU Counter Terminal</span>`,
  `<span class="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">MarkU Counter Terminal</span>`
);

content = content.replace(
  `class="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shadow-2xs"`,
  `class="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full"`
);

// 4. Main Section Card
content = content.replace(
  `class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5"`,
  `class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"`
);

// Tag "Counter Display"
content = content.replace(
  `class="shrink-0 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg uppercase tracking-wider"`,
  `class="shrink-0 text-[10px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg uppercase tracking-wider"`
);

// QR Container box
content = content.replace(
  `class="bg-gray-50/80 border border-gray-200/90 rounded-2xl p-4 sm:p-5 flex flex-col items-center space-y-3.5"`,
  `class="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col items-center space-y-3.5"`
);

content = content.replace(
  `class="qr-box w-56 h-56 sm:w-64 sm:h-64 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center"`,
  `class="qr-box w-56 h-56 sm:w-64 sm:h-64 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center"`
);

// Progress Bar
content = content.replace(
  `class="h-full bg-indigo-600 transition-all duration-1000 ease-linear w-full"`,
  `class="h-full bg-slate-900 transition-all duration-1000 ease-linear w-full"`
);

// 3 Step Guide boxes
content = content.replace(
  `class="grid grid-cols-3 gap-2 text-center text-[10px] text-gray-500 pt-1"`,
  `class="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 pt-1"`
);

content = content.replaceAll(
  `class="bg-gray-50 rounded-xl p-2 border border-gray-100"`,
  `class="bg-slate-50 rounded-lg p-2 border border-slate-200/70"`
);

fs.writeFileSync(shopPath, content, 'utf8');
console.log('Elevated shop.html styling successfully.');
