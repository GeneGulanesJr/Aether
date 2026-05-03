const CATEGORY_RULES = [
  [/\bcpu\s+cool(?:er|ing)?\b/i, 'cpu_cooler'],
  [/\b(?:heatsink|aio|all-in-one|liquid\s*cool|air\s*cool|cooler)\b/i, 'cpu_cooler'],
  [/\b(laptop|notebook|macbook)\b/i, 'laptop'],
  [/\b(premium\s*laptops?|gaming\s*laptop|2-in-1|convertible)\b/i, 'laptop'],
  [/\b(desktop|all-in-one|aio\s+desktop|mini\s*pc|minipc|tower|consumer\s*desktop)\b/i, 'desktop'],
  [/\b(tablet|ipad|android\s+tablet)\b/i, 'tablet'],
  [/\bmonitors?\b/i, 'monitor'],
  [/\bdisplay\b/i, 'monitor'],
  [/\b(keyboards?|keypads?)\b/i, 'keyboard'],
  [/\bmouse\b/i, 'mouse'],
  [/\bmice\b/i, 'mouse'],
  [/\b(headsets?|headphones?|earphones?|earbuds|vr\s*headset)\b/i, 'headset'],
  [/\b(speakers?|soundbar)\b/i, 'speaker'],
  [/\b(printers?|scanners?|multifunctions?)\b/i, 'printer'],
  [/\b(cameras?|webcams?|digital\s+cameras?|cctv|security\s*cameras?|surveillance)\b/i, 'camera'],
  [/\b(network|router|switch|wifi|wi-fi|access\s*point|adapter|range\s*extender|repeater|mesh)\b/i, 'network'],
  [/\b(ups|avr|uninterruptible\s*power|backup\s*power)\b/i, 'ups'],
  [/\b(software|os|operating\s+system|antivirus|office\s+suite|windows|ubuntu|linux|macos)\b/i, 'software'],
  [/\b(table|tables?|desk|gaming\s*desk)\b/i, 'table'],
  [/\b(chairs?|gaming\s*chair|office\s*chair)\b/i, 'chair'],
  [/\bprojectors?\b/i, 'projector'],
  [/\b(microphones?|mics?)\b/i, 'microphone'],
  [/\b(power\s*bank|power\s*station|external\s*battery)\b/i, 'power-bank'],
  [/\b(external\s+(?:ssd|hdd|drive)|portable\s+(?:ssd|hdd))\b/i, 'external-storage'],
  [/\b(cables?|cord|connector|hdmi\s*cable|usb\s*cable|displayport\s*cable|vga\s*cable|ethernet\s*cable)\b/i, 'cable'],
  [/\b(controllers?|gamepad|joystick|game\s*controller)\b/i, 'controller'],
  [/\bfans?\b/i, 'fans'],
  [/\bvideo\s*card\b/i, 'gpu'],
  [/\bgraphic[s]?\s*card\b/i, 'gpu'],
  [/\bgpu\b/i, 'gpu'],
  [/\bvga\b/i, 'gpu'],
  [/\bprocessor\b/i, 'cpu'],
  [/\bcpu\b/i, 'cpu'],
  [/\bryzen\b/i, 'cpu'],
  [/\bintel\s*core\b/i, 'cpu'],
  [/\barm\b/i, 'cpu'],
  [/\bmotherboard\b/i, 'motherboard'],
  [/\bmobo\b/i, 'motherboard'],
  [/\bram\b/i, 'ram'],
  [/\bddr[345]\b/i, 'ram'],
  [/\bso-?dimm\b/i, 'ram'],
  [/\bdimm\b/i, 'ram'],
  [/\bssd\b/i, 'storage'],
  [/\bhdd\b/i, 'storage'],
  [/\bhard\s*drives?\b/i, 'storage'],
  [/\bnvme\b/i, 'storage'],
  [/\bstorage\b/i, 'storage'],
  [/\bm\.2\b/i, 'storage'],
  [/\bpsu\b/i, 'psu'],
  [/\bpower\s*supply\b/i, 'psu'],
  [/\bpower\s*unit\b/i, 'psu'],
  [/\b(pc\s*case|computer\s*case|chassis|casing)\b/i, 'case'],
];

const categories = [
  "Airpods","All In One Desktop","Business Laptop","Desktop Bundle","Dvd Writer",
  "External Ssd","Flash Drive","Gaming Desktop","Gaming Laptop","Gaming Monitor",
  "Gaming Mouse","Internal Ssd","Keyboard Mouse Combo","Laptops","Mac","Macbook",
  "Magnetic Power Bank","Mainstream Laptop","Microsd Card","Monitor","Motherboard",
  "Otg Flash Drive","Power Bank","Premium Laptop","Processor","Projector",
  "Screen Protector","Tower Desktop","Uncategorized","Ups","Usb Cable","Wall Charger",
  "Wired Headset","Wired Keyboard","Wired Mouse","Wireless Mouse"
];

console.log("CATEGORY MATCH TEST – Silicon Valley (title-case strings)\n");
let unmatched = [];

for (const cat of categories) {
  let matched = null;
  for (const [pat, slug] of CATEGORY_RULES) {
    if (pat.test(cat)) { matched = slug; break; }
  }
  const status = matched ? `✓ → ${matched}` : '✗ → other (NO MATCH)';
  console.log(`  ${cat.padEnd(30)} ${status}`);
  if (!matched) unmatched.push(cat);
}

console.log(`\nUnmatched (${unmatched.length}):`, unmatched.join(', '));
