const fs = require('fs');

let index = fs.readFileSync('public/index.html', 'utf8');

// 1. Mobile responsive header fix (no overlapping on mobile)
const oldHeader = `<header class="bg-white border-b border-gray-100 sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
      
      <!-- Brand Logo: MarkU with curved orange hook/smile over U -->
      <a href="/" class="flex items-center gap-1">
        <span class="text-2xl font-black tracking-tight text-gray-900">Mark</span>
        <span class="text-2xl font-black tracking-tight text-[#d99b3b] relative">
          U
          <svg class="w-3.5 h-2 absolute -top-1 right-0 text-[#d99b3b]" viewBox="0 0 14 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M1 2C4 7 10 7 13 2" />
          </svg>
        </span>
      </a>

      <!-- Middle Navigation Links -->
      <nav class="hidden md:flex items-center gap-9 text-sm font-semibold text-gray-600">
        <a href="/" class="text-gray-900 font-bold border-b-2 border-amber-500 pb-1">Home</a>
        <a href="#features" class="hover:text-gray-900 transition-colors">Features</a>
        <a href="#pricing" class="hover:text-gray-900 transition-colors">Pricing</a>
        <a href="#about" class="hover:text-gray-900 transition-colors">About Us</a>
        <a href="#contact" class="hover:text-gray-900 transition-colors">Contact</a>
      </nav>

      <!-- Right Action Buttons -->
      <div class="flex items-center gap-3">
        <a href="/owner/login.html" class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-all">
          Login
        </a>
        <a href="/owner/register.html" class="btn-gold px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
          <span>Get Started Free</span>
          <span>&rarr;</span>
        </a>
      </div>

    </div>
  </header>`;

const newHeader = `<header class="bg-white border-b border-gray-100 sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-3.5 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
      
      <!-- Brand Logo: MarkU with curved orange hook/smile over U -->
      <a href="/" class="flex items-center gap-0.5 shrink-0">
        <span class="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Mark</span>
        <span class="text-xl sm:text-2xl font-black tracking-tight text-[#d99b3b] relative">
          U
          <svg class="w-3 h-1.5 sm:w-3.5 sm:h-2 absolute -top-1 right-0 text-[#d99b3b]" viewBox="0 0 14 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M1 2C4 7 10 7 13 2" />
          </svg>
        </span>
      </a>

      <!-- Middle Navigation Links (Desktop) -->
      <nav class="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
        <a href="/" class="text-gray-900 font-bold border-b-2 border-amber-500 pb-1">Home</a>
        <a href="#features" class="hover:text-gray-900 transition-colors">Features</a>
        <a href="#features" class="hover:text-gray-900 transition-colors">Why MarkU</a>
        <a href="https://api.whatsapp.com/send?phone=919311594509&text=Hi%20MarkU,%20I%20would%20like%20to%20learn%20more." target="_blank" class="hover:text-gray-900 transition-colors">Contact</a>
      </nav>

      <!-- Right Action Buttons (Mobile Optimized) -->
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <a href="/owner/login.html" class="px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-all">
          Login
        </a>
        <a href="/owner/register.html" class="btn-gold px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5">
          <span>Get Started</span>
          <span class="hidden sm:inline">&rarr;</span>
        </a>
      </div>

    </div>
  </header>`;

index = index.replace(oldHeader, newHeader);

// 2. Eyebrow overlapping fix
const oldEyebrow = `      <!-- Eyebrow Tag -->
      <div class="inline-block">
        <span class="text-[11px] sm:text-xs font-bold tracking-widest uppercase text-[#e5a83b] bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full">
          DIGITAL LOYALTY SOLUTIONS FOR LOCAL BUSINESSES
        </span>
      </div>`;

const newEyebrow = `      <!-- Eyebrow Tag -->
      <div class="inline-block max-w-full px-2">
        <span class="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-[#e5a83b] bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full inline-block leading-tight max-w-full break-words">
          DIGITAL LOYALTY FOR LOCAL BUSINESSES
        </span>
      </div>`;

index = index.replace(oldEyebrow, newEyebrow);

// 3. Hero Demo button replaced with Contact for Demo (redirecting to WhatsApp 9311594509)
const oldDemoBtn = `        <a href="/shop.html?shop=moon-shine" target="_blank" class="bg-[#1a1a1c] hover:bg-[#252528] border border-gray-700/80 text-white px-7 py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 w-full sm:w-auto transition-all">
          <span>Watch Demo</span>
          <span class="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] pl-0.5">▶</span>
        </a>`;

const newDemoBtn = `        <a href="https://api.whatsapp.com/send?phone=919311594509&text=Hi%20MarkU,%20I%20would%20like%20to%20book%20a%20demo%20for%20my%20business." target="_blank"
          class="bg-[#1a1a1c] hover:bg-[#252528] border border-emerald-500/40 text-white px-7 py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 w-full sm:w-auto transition-all shadow-lg hover:border-emerald-400">
          <svg class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
          <span>Contact for Demo</span>
        </a>`;

index = index.replace(oldDemoBtn, newDemoBtn);

// 4. Remove unwanted links in footer
const oldFooter = `  <!-- ========================================== -->
  <!-- FOOTER                                     -->
  <!-- ========================================== -->
  <footer class="bg-white py-10 text-xs text-gray-500 border-t border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
      
      <div class="flex items-center gap-2">
        <span class="text-lg font-black text-gray-900">Mark</span>
        <span class="text-lg font-black text-[#d99b3b]">U</span>
        <span class="text-gray-300 ml-2">•</span>
        <span class="text-gray-400">Digital Loyalty Solutions for Local Businesses</span>
      </div>

      <div class="flex items-center gap-6 font-semibold text-gray-600">
        <a href="/owner/register.html" class="text-[#cb8926] hover:underline">Register Shop</a>
        <a href="/owner/login.html" class="hover:text-gray-900">Merchant Login</a>
        <a href="/shop.html?shop=moon-shine" target="_blank" class="hover:text-gray-900">Counter Kiosk</a>
        <a href="/card.html?shop=moon-shine" target="_blank" class="hover:text-gray-900">Customer Pass</a>
      </div>

    </div>
  </footer>`;

const newFooter = `  <!-- ========================================== -->
  <!-- FOOTER                                     -->
  <!-- ========================================== -->
  <footer class="bg-white py-8 text-xs text-gray-500 border-t border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
      
      <div class="flex items-center gap-2 justify-center sm:justify-start">
        <span class="text-lg font-black text-gray-900">Mark</span>
        <span class="text-lg font-black text-[#d99b3b]">U</span>
        <span class="text-gray-300">•</span>
        <span class="text-gray-500 text-[11px]">Digital Loyalty System for Local Businesses</span>
      </div>

      <div class="text-[11px] text-gray-400">
        &copy; 2026 MarkU. All rights reserved.
      </div>

    </div>
  </footer>`;

index = index.replace(oldFooter, newFooter);

fs.writeFileSync('public/index.html', index, 'utf8');
console.log('public/index.html updated successfully');
