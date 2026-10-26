const fs = require('fs');

let card = fs.readFileSync('public/card.html', 'utf8');

// 1. Update body
card = card.replace(
  '<body class="bg-slate-50 text-slate-900 min-h-screen flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-slate-900 selection:text-white">',
  '<body class="bg-[#0b0b0d] text-white min-h-screen flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-[#d99b3b] selection:text-black">'
);

// 2. Update Header
const oldHeader = `  <!-- Minimal Brand Header (No Overlap) -->
  <header class="w-full max-w-sm mx-auto flex items-center justify-between pt-1 pb-3">
    <div class="flex items-center gap-2 min-w-0">
      <span class="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">M</span>
      <span class="font-bold text-sm text-slate-900 tracking-tight truncate">MarkU Loyalty Pass</span>
    </div>
    <span id="memberBadge" class="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
      Verified Pass
    </span>
  </header>`;

const newHeader = `  <!-- Minimal Brand Header -->
  <header class="w-full max-w-sm mx-auto flex items-center justify-between pt-1 pb-3">
    <div class="flex items-center gap-2 min-w-0">
      <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#cb8926] to-[#e5a83b] text-black font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">M</div>
      <div class="flex items-center gap-1">
        <span class="font-extrabold text-sm text-white tracking-tight">Mark<span class="text-[#d99b3b]">U</span></span>
        <span class="text-[10px] text-zinc-400 font-medium">Pass</span>
      </div>
    </div>
    <span id="memberBadge" class="text-[10px] font-mono font-bold text-[#d99b3b] bg-[#d99b3b]/10 border border-[#d99b3b]/30 px-2.5 py-0.5 rounded-full shrink-0">
      Verified Pass
    </span>
  </header>`;

card = card.replace(oldHeader, newHeader);

// 3. Update Social Review buttons inside Card
card = card.replace(
  'class="hidden items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-semibold text-xs transition-all shadow-xs"',
  'class="hidden items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#1c1810] hover:bg-[#272013] border border-[#d99b3b]/40 text-[#f5b041] font-bold text-xs transition-all shadow-xs"'
);

card = card.replace(
  'class="hidden items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-900 font-semibold text-xs transition-all shadow-xs"',
  'class="hidden items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#1d1419] hover:bg-[#281a22] border border-pink-500/40 text-pink-300 font-bold text-xs transition-all shadow-xs"'
);

// 4. Update OTP Prompt Box
const oldOtpPrompt = `    <!-- SECURE OTP VERIFICATION FORM (Shown when not authenticated) -->
    <div id="otpPromptBox" class="hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          Secure Pass Access
        </span>
        <h2 id="promptShopTitle" class="text-base font-bold text-gray-900 mt-2">View Your Loyalty Pass</h2>
        <p class="text-xs text-gray-500 mt-0.5">Enter your phone number to access your pass.</p>
      </div>

      <!-- Step 1: Phone input -->
      <form id="phoneStepForm" onsubmit="handleSendCardOtp(event)" class="space-y-3">
        <div>
          <label for="promptPhone" class="block text-xs font-semibold text-gray-700 mb-1">Mobile Number</label>
          <input type="tel" id="promptPhone" required placeholder="+919876543210"
            class="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <button type="submit" id="sendOtpBtn"
          class="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs">
          Send Verification Code (OTP) &rarr;
        </button>
      </form>

      <!-- Step 2: OTP Code input (Hidden initially) -->
      <form id="otpStepForm" onsubmit="handleVerifyCardOtp(event)" class="hidden space-y-3">
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex justify-between items-center">
          <div>
            <span class="text-indigo-500 block text-[10px] font-semibold uppercase">Code sent to</span>
            <span id="displayOtpPhone" class="font-mono font-bold text-xs">+91 ••••• •••••</span>
          </div>
          <button type="button" onclick="backToCardPhoneStep()" class="text-xs font-semibold text-indigo-600 hover:underline">
            Change
          </button>
        </div>

        <div id="cardDemoBanner" class="hidden rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 text-center font-mono">
          Demo Code: <strong id="cardDemoCodeVal">123456</strong>
        </div>

        <div>
          <label for="promptOtp" class="block text-xs font-semibold text-gray-700 mb-1">6-Digit Verification Code</label>
          <input type="text" id="promptOtp" maxlength="6" inputmode="numeric" required placeholder="123456"
            class="otp-input w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-center text-lg font-bold font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>

        <button type="submit" id="verifyOtpBtn"
          class="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs">
          Verify & Open My Pass &rarr;
        </button>
      </form>

      <!-- Direct Camera Scan Option from Auth Screen -->
      <div class="pt-2 border-t border-gray-100">
        <button type="button" onclick="openQrScanner()"
          class="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-2xs">
          <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>At counter? Scan QR with Camera &rarr;</span></span>
        </button>
      </div>
    </div>`;

const newOtpPrompt = `    <!-- SECURE OTP VERIFICATION FORM -->
    <div id="otpPromptBox" class="hidden bg-[#141417] border border-[#242429] rounded-2xl p-6 shadow-2xl space-y-4">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-[#d99b3b] bg-[#d99b3b]/10 border border-[#d99b3b]/30 px-2 py-0.5 rounded">
          Secure Pass Access
        </span>
        <h2 id="promptShopTitle" class="text-base font-extrabold text-white mt-2">View Your Loyalty Pass</h2>
        <p class="text-xs text-zinc-400 mt-0.5">Enter your phone number to access your pass.</p>
      </div>

      <!-- Step 1: Phone input -->
      <form id="phoneStepForm" onsubmit="handleSendCardOtp(event)" class="space-y-3">
        <div>
          <label for="promptPhone" class="block text-xs font-semibold text-zinc-300 mb-1">Mobile Number</label>
          <input type="tel" id="promptPhone" required placeholder="+919876543210"
            class="w-full rounded-xl border border-[#2e2e36] bg-[#0e0e11] px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#d99b3b]">
        </div>
        <button type="submit" id="sendOtpBtn"
          class="w-full btn-gold py-2.5 text-sm font-bold rounded-xl shadow-md">
          Send Verification Code (OTP) &rarr;
        </button>
      </form>

      <!-- Step 2: OTP Code input (Hidden initially) -->
      <form id="otpStepForm" onsubmit="handleVerifyCardOtp(event)" class="hidden space-y-3">
        <div class="bg-[#1c1c22] border border-[#2e2e36] rounded-xl p-3 text-xs text-zinc-300 flex justify-between items-center">
          <div>
            <span class="text-zinc-500 block text-[10px] font-semibold uppercase">Code sent to</span>
            <span id="displayOtpPhone" class="font-mono font-bold text-xs text-[#d99b3b]">+91 ••••• •••••</span>
          </div>
          <button type="button" onclick="backToCardPhoneStep()" class="text-xs font-semibold text-[#d99b3b] hover:underline">
            Change
          </button>
        </div>

        <div id="cardDemoBanner" class="hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300 text-center font-mono">
          Demo Code: <strong id="cardDemoCodeVal">123456</strong>
        </div>

        <div>
          <label for="promptOtp" class="block text-xs font-semibold text-zinc-300 mb-1">6-Digit Verification Code</label>
          <input type="text" id="promptOtp" maxlength="6" inputmode="numeric" required placeholder="123456"
            class="otp-input w-full rounded-xl border border-[#2e2e36] bg-[#0e0e11] px-3.5 py-2.5 text-center text-lg font-bold font-mono text-white focus:outline-none focus:border-[#d99b3b]">
        </div>

        <button type="submit" id="verifyOtpBtn"
          class="w-full btn-gold py-2.5 text-sm font-bold rounded-xl shadow-md">
          Verify & Open My Pass &rarr;
        </button>
      </form>

      <!-- Direct Camera Scan Option from Auth Screen -->
      <div class="pt-2 border-t border-[#232328]">
        <button type="button" onclick="openQrScanner()"
          class="w-full flex items-center justify-center gap-2 bg-[#1a1a1e] hover:bg-[#222227] border border-[#2e2e36] text-zinc-200 font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-2xs">
          <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-[#d99b3b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>At counter? Scan QR with Camera &rarr;</span></span>
        </button>
      </div>
    </div>`;

card = card.replace(oldOtpPrompt, newOtpPrompt);

// 5. Update Camera Scanner Modal
const oldModal = `  <!-- Live In-Page Camera QR Scanner Modal -->
  <div id="cameraScannerModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-xs">
    <div class="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 border border-gray-200">
      <div class="flex items-center justify-between pb-2 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold shadow-xs"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
          <div>
            <h3 class="font-bold text-sm text-gray-900">Scan Counter QR</h3>
            <p class="text-[10px] text-gray-500">Aim camera at the shop checkout display</p>
          </div>
        </div>
        <button type="button" onclick="closeQrScanner()" class="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" aria-label="Close Scanner">
          ✕
        </button>
      </div>

      <!-- Camera Viewfinder -->
      <div class="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-dashed border-indigo-400">
        <div id="qrReaderBox" class="w-full h-full"></div>
        <div id="scannerErrorMessage" class="hidden absolute inset-0 p-4 bg-gray-900/90 text-white text-xs flex items-center justify-center text-center"></div>
      </div>

      <p class="text-center text-[11px] text-gray-500">
        Point your camera steadily at the rotating QR on the counter screen.
      </p>

      <button type="button" onclick="closeQrScanner()"
        class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors">
        Cancel
      </button>
    </div>
  </div>`;

const newModal = `  <!-- Live In-Page Camera QR Scanner Modal -->
  <div id="cameraScannerModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
    <div class="bg-[#141417] w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 border border-[#2e2e36] text-white">
      <div class="flex items-center justify-between pb-2 border-b border-[#232328]">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-[#d99b3b]/15 text-[#d99b3b] flex items-center justify-center text-sm font-bold shadow-xs"><svg class="w-4 h-4 text-[#d99b3b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
          <div>
            <h3 class="font-bold text-sm text-white">Scan Counter QR</h3>
            <p class="text-[10px] text-zinc-400">Aim camera at the shop checkout display</p>
          </div>
        </div>
        <button type="button" onclick="closeQrScanner()" class="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors" aria-label="Close Scanner">
          ✕
        </button>
      </div>

      <!-- Camera Viewfinder -->
      <div class="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-dashed border-[#d99b3b]/60">
        <div id="qrReaderBox" class="w-full h-full"></div>
        <div id="scannerErrorMessage" class="hidden absolute inset-0 p-4 bg-black/90 text-white text-xs flex items-center justify-center text-center"></div>
      </div>

      <p class="text-center text-[11px] text-zinc-400">
        Point your camera steadily at the rotating QR on the counter screen.
      </p>

      <button type="button" onclick="closeQrScanner()"
        class="w-full py-2.5 bg-[#202026] hover:bg-[#2b2b33] text-zinc-200 font-semibold rounded-xl text-xs transition-colors">
        Cancel
      </button>
    </div>
  </div>`;

card = card.replace(oldModal, newModal);

// 6. Update cooldown text colors in renderCard
card = card.replace(
  "timer.className = 'mt-0.5 font-mono text-xs font-bold text-emerald-600';",
  "timer.className = 'mt-0.5 font-mono text-xs font-bold text-emerald-400';"
);

card = card.replace(
  "timer.className = 'mt-0.5 font-mono text-xs font-bold text-amber-600';",
  "timer.className = 'mt-0.5 font-mono text-xs font-bold text-amber-400';"
);

fs.writeFileSync('public/card.html', card, 'utf8');
console.log('Successfully elevated customer front end to luxury dark gold theme');
