const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, '..', 'public', 'owner', 'dashboard.html');
let content = fs.readFileSync(dashPath, 'utf8');

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
    .fintech-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px 0 rgba(15, 23, 42, 0.02);
    }
  </style>`;

content = content.replace(
  /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>[\s\S]*?<\/style>/,
  fontImports
);

// 2. Body
content = content.replace(
  `class="bg-gray-50 text-gray-900 min-h-screen antialiased flex flex-col pb-24 sm:pb-0"`,
  `class="bg-slate-50 text-slate-900 min-h-screen antialiased flex flex-col pb-24 sm:pb-0 selection:bg-slate-900 selection:text-white"`
);

// 3. Header brand
content = content.replace(
  `<span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">M</span>`,
  `<span class="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-sm flex items-center justify-center shadow-xs">M</span>`
);

// Shop switcher & add button
content = content.replace(
  `class="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 text-[11px] sm:text-xs font-semibold rounded-xl px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[80px] xs:max-w-[110px] sm:max-w-[140px] truncate"`,
  `class="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-[11px] sm:text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer max-w-[80px] xs:max-w-[110px] sm:max-w-[140px] truncate"`
);

content = content.replace(
  `class="text-[11px] sm:text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-xl transition-colors whitespace-nowrap shadow-2xs"`,
  `class="text-[11px] sm:text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shadow-2xs"`
);

// Menu button
content = content.replace(
  `class="h-8.5 sm:h-10 px-2.5 sm:px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 flex items-center gap-1.5 sm:gap-2 text-gray-800 transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 whitespace-nowrap"`,
  `class="h-8.5 sm:h-10 px-2.5 sm:px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center gap-1.5 sm:gap-2 text-slate-800 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-900 whitespace-nowrap"`
);

// Primary Form Save Buttons: Replace indigo-600 with slate-900 institutional styling
content = content.replaceAll(
  `class="w-full sm:w-auto px-7 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2"`,
  `class="w-full sm:w-auto px-7 py-3 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2"`
);

fs.writeFileSync(dashPath, content, 'utf8');
console.log('Elevated dashboard.html styling successfully.');
