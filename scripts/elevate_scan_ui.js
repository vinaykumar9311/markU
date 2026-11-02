const fs = require('fs');
const path = require('path');

const scanPath = path.join(__dirname, '..', 'public', 'scan.html');
let content = fs.readFileSync(scanPath, 'utf8');

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
    .otp-input {
      letter-spacing: 0.35em;
      font-feature-settings: "tnum";
    }
  </style>`;

content = content.replace(
  /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>[\s\S]*?<\/style>/,
  fontImports
);

// 2. Body
content = content.replace(
  `class="bg-gray-100 text-gray-900 min-h-screen flex flex-col justify-between p-4 sm:p-6 antialiased"`,
  `class="bg-slate-50 text-slate-900 min-h-screen flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-slate-900 selection:text-white"`
);

// 3. Header
content = content.replace(
  `<span class="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">M</span>`,
  `<span class="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">M</span>`
);

content = content.replace(
  `<span class="font-bold text-sm text-gray-900 truncate">MarkU Pass</span>`,
  `<span class="font-bold text-sm text-slate-900 tracking-tight truncate">MarkU Stamp Gateway</span>`
);

content = content.replace(
  `class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0"`,
  `class="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0"`
);

// 4. Cards
content = content.replace(
  `class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5"`,
  `class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5"`
);

content = content.replace(
  `class="hidden bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center space-y-4"`,
  `class="hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center space-y-4"`
);

content = content.replace(
  `class="hidden bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center space-y-4"`,
  `class="hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center space-y-4"`
);

// Buttons
content = content.replaceAll(
  `class="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-sm"`,
  `class="w-full bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-xs"`
);

// Tags
content = content.replaceAll(
  `class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded"`,
  `class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"`
);

fs.writeFileSync(scanPath, content, 'utf8');
console.log('Elevated scan.html styling successfully.');
