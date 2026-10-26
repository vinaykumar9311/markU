const fs = require('fs');
const path = require('path');

const cardPath = path.join(__dirname, '..', 'public', 'card.html');
let content = fs.readFileSync(cardPath, 'utf8');

// Update Card Container to match mockup phone
const oldCardSection = `<section id="cardContainer" class="hidden bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      
      <!-- Card Top: Shop Name & Pass Type -->
      <div class="flex items-start justify-between border-b border-gray-100 pb-3 gap-2">
        <div class="min-w-0 flex-1">
          <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            Official Loyalty Pass
          </span>
          <h1 id="cardShopName" class="mt-1 text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">Shop Name</h1>
          <p id="cardRewardSub" class="text-xs text-gray-500 mt-0.5 truncate">10 stamps = 1 free reward</p>
        </div>
        <span id="stampCount" class="shrink-0 rounded-lg bg-slate-900 px-3 py-1 font-mono text-xs font-bold text-white border border-slate-800 shadow-2xs whitespace-nowrap">
          0 / 10
        </span>
      </div>

      <!-- Member Details on the Card -->
      <div class="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200/80">
        <div class="min-w-0 pr-2">
          <span class="text-[10px] uppercase font-bold text-gray-400 block">Member</span>
          <span id="customerName" class="font-semibold text-gray-900 truncate block">Rewards Member</span>
        </div>
        <div class="text-right shrink-0">
          <span class="text-[10px] uppercase font-bold text-gray-400 block">Verified Phone</span>
          <span id="customerPhone" class="font-mono font-medium text-gray-700">+91 ••••• •••••</span>
        </div>
      </div>

      <!-- In-Page Counter QR Camera Scanner Button -->
      <button type="button" onclick="openQrScanner()"
        class="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-xs">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>Scan Counter QR with Camera</span>
      </button>

      <!-- Stamps Progress Grid -->
      <div class="space-y-1.5">
        <div class="flex justify-between items-center text-xs text-gray-500">
          <span>Stamps Progress</span>
          <span class="text-gray-400">Final = Free Reward</span>
        </div>
        <div id="stamps" class="grid grid-cols-5 gap-2"></div>
      </div>

      <!-- Live Cooldown Status -->
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
        <div class="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Counter Check-In</div>
        <div id="cooldown" class="mt-0.5 font-mono text-xs font-bold text-emerald-600">Ready to collect</div>
      </div>

      <div class="flex justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span>Rewards earned</span>
        <span id="rewards" class="font-bold text-gray-900">0</span>
      </div>`;

const newCardSection = `<section id="cardContainer" class="hidden bg-[#111113] text-white border-2 border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
      
      <!-- Top Center Shop Avatar & Title (Exact Mockup Style) -->
      <div class="text-center space-y-1.5 border-b border-white/10 pb-4">
        <div class="w-12 h-12 rounded-full border-2 border-amber-500 bg-black flex items-center justify-center mx-auto text-amber-500 text-lg shadow-md font-bold">
          ☕
        </div>
        <h1 id="cardShopName" class="text-lg font-black text-white tracking-tight">Shop Name</h1>
        <p class="text-xs text-gray-400 font-medium">Loyalty Program</p>
        <span id="stampCount" class="inline-block font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 rounded-full mt-1">
          0 / 10 Stamps
        </span>
      </div>

      <!-- Member Details on the Card -->
      <div class="flex items-center justify-between text-xs bg-white/5 rounded-xl px-3.5 py-2.5 border border-white/10 text-left">
        <div class="min-w-0 pr-2">
          <span class="text-[10px] uppercase font-bold text-gray-400 block">Member</span>
          <span id="customerName" class="font-semibold text-white truncate block">Rewards Member</span>
        </div>
        <div class="text-right shrink-0">
          <span class="text-[10px] uppercase font-bold text-gray-400 block">Verified Phone</span>
          <span id="customerPhone" class="font-mono font-medium text-amber-400">+91 ••••• •••••</span>
        </div>
      </div>

      <!-- Circular Stamps Grid (Exact Mockup Match: Gold Stars for Collected, Circles for Uncollected) -->
      <div class="space-y-2 py-1">
        <div class="flex justify-between items-center text-[11px] text-gray-400">
          <span>Stamps Progress</span>
          <span class="text-amber-400 font-medium" id="cardRewardSub">Collect 10 stamps, get Free Coffee!</span>
        </div>
        <div id="stamps" class="grid grid-cols-5 gap-2.5 text-center"></div>
      </div>

      <!-- Golden Scanner Button -->
      <button type="button" onclick="openQrScanner()"
        class="w-full flex items-center justify-center gap-2 btn-gold font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-lg">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>Scan Counter QR with Camera</span>
      </button>

      <!-- Live Cooldown Status -->
      <div class="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
        <div class="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Counter Status</div>
        <div id="cooldown" class="mt-0.5 font-mono text-xs font-bold text-emerald-400">Ready to collect next stamp</div>
      </div>

      <div class="flex justify-between border-t border-white/10 pt-3 text-xs text-gray-400">
        <span>Total Rewards Redeemed</span>
        <span id="rewards" class="font-bold text-amber-400">0</span>
      </div>`;

if (content.includes(oldCardSection)) {
  content = content.replace(oldCardSection, newCardSection);
}

// In JavaScript, update the dynamic stamp slot styling to Gold Star discs:
const oldStampsScript = `slot.className = \`grid aspect-square place-items-center rounded-xl text-xs font-mono font-bold transition-all \${
          filled
            ? (isTarget ? 'bg-emerald-600 text-white font-bold shadow-xs stamp-pop ring-2 ring-emerald-400' : 'bg-slate-900 text-white shadow-2xs stamp-pop')
            : (isTarget ? 'border-2 border-dashed border-emerald-400/80 bg-emerald-50/50 text-emerald-700' : 'bg-slate-100 text-slate-400 border border-slate-200/60')
        }\`;
        if (filled) {
          slot.innerHTML = isTarget 
            ? '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>'
            : '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
        } else {
          slot.textContent = String(number);
        }`;

const newStampsScript = `slot.className = \`grid aspect-square place-items-center rounded-full text-xs font-mono font-bold transition-all \${
          filled
            ? 'bg-[#e5a83b] text-black font-black text-sm shadow-md stamp-pop'
            : (isTarget ? 'border-2 border-dashed border-amber-400/80 bg-amber-500/10 text-amber-400' : 'border-2 border-gray-600 bg-transparent text-gray-500')
        }\`;
        if (filled) {
          slot.textContent = '★';
        } else if (isTarget) {
          slot.textContent = '🎁';
        } else {
          slot.textContent = String(number);
        }`;

if (content.includes(oldStampsScript)) {
  content = content.replace(oldStampsScript, newStampsScript);
}

// Add btn-gold styling to card.html head
if (!content.includes('.btn-gold')) {
  content = content.replace(
    '</style>',
    `  .btn-gold {
      background: linear-gradient(135deg, #e5a83b 0%, #cb8926 100%);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(203, 137, 38, 0.35);
      transition: all 0.2s ease;
    }
    .btn-gold:hover {
      background: linear-gradient(135deg, #edb449 0%, #d9932d 100%);
      transform: translateY(-1px);
    }
  </style>`
  );
}

fs.writeFileSync(cardPath, content, 'utf8');
console.log('Restyled card.html to match center phone mockup.');
