const fs = require('fs');
const path = require('path');

const cardPath = path.join(__dirname, '..', 'public', 'card.html');
let content = fs.readFileSync(cardPath, 'utf8');

// 1. Add Plus Jakarta Sans & JetBrains Mono to head
const fontImports = `  <!-- Typography: Plus Jakarta Sans & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
  <style>
    body { 
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-tap-highlight-color: transparent;
      -webkit-font-smoothing: antialiased;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .stamp-pop {
      animation: stampPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes stampPop {
      0% { transform: scale(0.6); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
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

// 2. Body class
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
  `<span class="font-bold text-sm text-slate-900 tracking-tight truncate">MarkU Loyalty Pass</span>`
);

content = content.replace(
  `class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0"`,
  `class="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0"`
);

// 4. Card container
content = content.replace(
  `class="hidden bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4"`,
  `class="hidden bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"`
);

content = content.replace(
  `class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded"`,
  `class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"`
);

content = content.replace(
  `class="shrink-0 rounded-lg bg-indigo-50 px-3 py-1 font-mono text-xs font-bold text-indigo-700 border border-indigo-100 whitespace-nowrap"`,
  `class="shrink-0 rounded-lg bg-slate-900 px-3 py-1 font-mono text-xs font-bold text-white border border-slate-800 shadow-2xs whitespace-nowrap"`
);

content = content.replace(
  `class="flex items-center justify-between text-xs bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-100"`,
  `class="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200/80"`
);

// Camera Scan Button in Card
content = content.replace(
  `class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm"`,
  `class="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-xs"`
);

// Cooldown status box in Card
content = content.replace(
  `class="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"`,
  `class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"`
);

// OTP Prompt box styling
content = content.replace(
  `class="hidden bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4"`,
  `class="hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4"`
);

content = content.replace(
  `class="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"`,
  `class="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"`
);

content = content.replace(
  `class="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"`,
  `class="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"`
);

// In stamps generation loop: upgrade to verified emerald and slate-900 tokens
const oldStampsGen = `slot.className = \`grid aspect-square place-items-center rounded-xl text-xs font-bold transition-all \${
          filled
            ? (isTarget ? 'bg-indigo-600 text-white font-bold shadow-sm stamp-pop' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 stamp-pop')
            : (isTarget ? 'border-2 border-dashed border-gray-300 text-gray-400' : 'bg-gray-100 text-gray-400')
        }\`;
        slot.textContent = filled ? (isTarget ? '★' : '✓') : String(number);`;

const newStampsGen = `slot.className = \`grid aspect-square place-items-center rounded-xl text-xs font-mono font-bold transition-all \${
          filled
            ? (isTarget ? 'bg-emerald-600 text-white font-bold shadow-xs stamp-pop ring-2 ring-emerald-400' : 'bg-slate-900 text-white shadow-2xs stamp-pop')
            : (isTarget ? 'border-2 border-dashed border-emerald-400/80 bg-emerald-50/50 text-emerald-700' : 'bg-slate-100 text-slate-400 border border-slate-200/60')
        }\`;
        if (filled) {
          slot.innerHTML = isTarget 
            ? '<svg class=\"w-4 h-4 text-white\" fill=\"currentColor\" viewBox=\"0 0 20 20\"><path d=\"M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z\"/></svg>'
            : '<svg class=\"w-4 h-4 text-emerald-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.5\" d=\"M5 13l4 4L19 7\"/></svg>';
        } else {
          slot.textContent = String(number);
        }`;

if (content.includes(oldStampsGen)) {
  content = content.replace(oldStampsGen, newStampsGen);
}

fs.writeFileSync(cardPath, content, 'utf8');
console.log('Elevated card.html styling successfully.');
