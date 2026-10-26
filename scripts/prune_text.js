const fs = require('fs');

// 1. Clean public/index.html
let index = fs.readFileSync('public/index.html', 'utf8');

// Simplify subheadline
index = index.replace(
  'MarkU helps you create digital stamp cards, reward loyal customers and bring them back &mdash; all in one simple, powerful platform.',
  'Digital stamp cards and loyalty rewards for your business.'
);

// Simplify WHY MARKU subtitle
index = index.replace(
  'MarkU makes it simple for local businesses to create meaningful rewards, drive repeat visits and grow &mdash; digitally.',
  'Simple, automated customer retention.'
);

// Simplify cards text
index = index.replace('Replace paper cards with beautiful, easy-to-use digital stamp cards.', 'Digital cards accessible via phone camera.');
index = index.replace('Offer exclusive rewards and discounts to keep customers coming back.', 'Custom reward milestones and instant redemption.');
index = index.replace('Track performance, understand your customers and grow smarter.', 'Live customer analytics and stamp tracking.');
index = index.replace('Get started in minutes with no technical hassle.', 'Zero hardware. Ready in 2 minutes.');

// Simplify proof section subtitle
index = index.replace('<p class="text-xs text-gray-500">More loyalty. More repeat visits. More growth.</p>', '');

fs.writeFileSync('public/index.html', index, 'utf8');
console.log('index.html pruned');

// 2. Clean public/owner/dashboard.html
let dash = fs.readFileSync('public/owner/dashboard.html', 'utf8');

// Remove subheadings and filler explanatory text
dash = dash.replace(
  `<p class="text-xs text-gray-500 mt-1 font-normal">
              Here's what's happening with your loyalty program today
            </p>`,
  ''
);

dash = dash.replace(
  '<p class="text-[11px] text-gray-400">Active passes registered at your counter</p>',
  ''
);

// Quick action sublabels
dash = dash.replace('<div class="text-[10px] text-gray-400 font-normal">Android & iOS home screen</div>', '');
dash = dash.replace('<div class="text-[10px] text-gray-400 font-normal">5-min rolling QR checkout</div>', '');
dash = dash.replace('<div class="text-[10px] text-gray-400 font-normal">Logging out from your account</div>', '');
dash = dash.replace('<div class="text-[10px] text-red-400 font-normal">Permanently delete all data</div>', '');

// Promo box text
dash = dash.replace(
  `<p class="text-xs text-gray-400 leading-relaxed font-normal">
                  More loyalty. More repeat visits. More growth.
                </p>`,
  ''
);

// View 2 subtitle
dash = dash.replace(
  '<p class="text-xs text-gray-500 mt-0.5">Customize what your customers earn and how many stamps complete a card.</p>',
  ''
);

// View 3 subtitle
dash = dash.replace(
  '<p class="text-xs text-gray-500 mt-1">Stops double-scanning and prevents customers from claiming multiple stamps in one sitting.</p>',
  ''
);

// Cooldown card text
dash = dash.replace('<p class="text-[11px] text-gray-400 mt-1">0 Hours · Employee testing and counter demos.</p>', '');
dash = dash.replace('<p class="text-[11px] text-gray-400 mt-1">1 - 2 Hours · Cafes, bakeries & bubble tea spots.</p>', '');
dash = dash.replace('<p class="text-[11px] text-gray-400 mt-1">12 Hours · Supports lunch and dinner visits.</p>', '');
dash = dash.replace('<p class="text-[11px] text-gray-500 mt-1">24 Hours · Retail stores, salons & restaurants.</p>', '');

fs.writeFileSync('public/owner/dashboard.html', dash, 'utf8');
console.log('dashboard.html pruned');

// 3. Clean public/card.html
let card = fs.readFileSync('public/card.html', 'utf8');

// Remove redundant guidance
card = card.replace(
  `<p class="text-center text-[11px] text-gray-400 pt-1">
        Present this pass at counter checkout to claim rewards.
      </p>`,
  ''
);

card = card.replace(
  `<div class="text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center">
          Love Your Experience?
        </div>`,
  ''
);

card = card.replace(
  '<p class="text-xs text-gray-500 mt-0.5">Verify your mobile number with a quick 6-digit OTP code to view your pass.</p>',
  '<p class="text-xs text-gray-500 mt-0.5">Enter your phone number to access your pass.</p>'
);

fs.writeFileSync('public/card.html', card, 'utf8');
console.log('card.html pruned');
