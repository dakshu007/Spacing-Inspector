// Copy and data shared by the page, the structured data and llms.txt.

export const SITE_URL = 'https://spacinginspector.netlify.app';
export const STORE_URL = 'https://chromewebstore.google.com/detail/spacing-inspector/ppnnhboeiefjhloholfbahddldadcjmk';
export const USERS = '858';

// SEO plan
export const SEO = {
  title: 'Spacing Inspector: Inspect CSS Margin & Padding on Any Site',
  description:
    'Free Chrome extension to inspect margin and padding on any website. See the box model, measure distances, audit your spacing and copy CSS or Tailwind.',
  focusKeyword: 'spacing inspector chrome extension',
  primaryKeyword: 'inspect margin and padding',
  secondaryKeywords: [
    'CSS box model visualizer',
    'measure distance between elements',
    'check website spacing',
    '8pt grid checker',
    'copy CSS as Tailwind',
    'design QA Chrome extension'
  ]
};

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is Spacing Inspector?',
    a: 'Spacing Inspector is a free Chrome extension that shows the CSS box model of any element you hover: margin, border, padding, content and flex or grid gaps, with the pixel value on every side. Version 2.0 adds a Figma-style measure tool, a spacing audit that scores a whole page, and one-key copy as CSS, rem or Tailwind.'
  },
  {
    q: 'Is Spacing Inspector free?',
    a: 'Yes. Every feature is free, with no account, no trial and no paid tier.'
  },
  {
    q: 'Does Spacing Inspector collect my data?',
    a: 'No. It runs entirely in your browser and sends nothing to any server. Your settings sync through your own Chrome profile.'
  },
  {
    q: 'How do I inspect margin and padding on a website?',
    a: 'Install Spacing Inspector, open any page and press Alt+Shift+S (or click the toolbar icon). Hover an element: margin shows in blue, padding in green, border in yellow and gaps as purple stripes, each labelled with its value.'
  },
  {
    q: 'How does the spacing score work?',
    a: 'Press A to run the Spacing Audit. It reads every margin, padding and gap on the page, detects whether the design uses a 4px or 8px grid, and scores from 0 to 100 how many values sit on it. Every off-grid value is listed with a suggested fix you can copy as CSS.'
  },
  {
    q: 'Can I copy spacing as Tailwind classes?',
    a: 'Yes. Press C on any element to copy its spacing as shorthand CSS, rem values or Tailwind classes such as mt-8 py-3.5 px-7.'
  },
  {
    q: 'Does it work on localhost and in other browsers?',
    a: 'It works on any http or https page, including your local dev server. It runs in Chrome and in Chromium browsers that install from the Chrome Web Store, such as Microsoft Edge, Brave and Arc.'
  }
];

export const STEPS = [
  { title: 'Add it to Chrome', text: 'Install free from the Chrome Web Store. No account, no setup.' },
  { title: 'Hover anything', text: 'Press Alt+Shift+S, then hover. Margin, border, padding and gaps appear with their values.' },
  { title: 'Measure and audit', text: 'Hold Alt to measure between elements. Press A for the page’s spacing score.' },
  { title: 'Copy and ship', text: 'Press C to copy CSS or Tailwind, or copy every audit fix at once.' }
];

export const FEATURES = [
  'Hover to see margin, border, padding, content and gap',
  'Measure the distance between any two elements',
  'Spacing Audit: a 0 to 100 score with suggested fixes',
  'Copy spacing as CSS, rem or Tailwind classes',
  'Walk the DOM with the arrow keys',
  '4px or 8px grid overlay',
  'Works on any website, including localhost'
];
