/**
 * Complete STORE_RULES generation script v2
 * Builds accurate category mappings for all 14 PC component stores
 */

import fs from 'fs';
import path from 'path';

const INPUT_DIR = '/home/genegulanesjr/Documents/GulanesKorp/PCBuilder/scrapper/output';

// ── Store-specific categorization function ────────────────────────────────
// Takes a raw category string and store name, returns unified frontend category
export function getFrontendCategory(raw, storeName = '') {
  if (!raw || typeof raw !== 'string') return 'other';
  const s = raw.trim();
  if (!s) return 'other';
  const lower = s.toLowerCase();

  // ==================== BEN STORE ====================
  if (storeName === 'Ben Store') {
    if (s === 'Microsoft' || s === 'Lenovo' || s === 'Razer') return 'laptop';
    if (s === 'Laptops' || s === 'Premium Laptops') return 'laptop';
    if (s === 'Asus' || s === 'Msi' || s === 'Gigabyte' || s === 'Aorus' ||
        s === 'Hp' || s === 'Dell' || s === 'Alienware Dell' || s === 'Acer' ||
        s === 'Samsung' || s === 'Fantech' || s === 'Lg') return 'other';
    if (s === 'Gaming Mice') return 'mouse';
    if (s === 'Gaming Keyboards') return 'keyboard';
    if (s === 'Gaming Headsets') return 'headset';
    if (s === 'Memory') return 'ram';
    if (s === 'Display') return 'monitor';
    if (s === 'Audio Visual' || s === 'Speakers' || s === 'Speaker') return 'speaker';
    if (s === 'Gaming Handhelds') return 'other';
    if (s === 'Multimedia Peripherals') return 'other';
    if (s === 'Laptop Fan Coolers') return 'cpu_cooler';
    if (s === 'Gaming Bags') return 'other';
    if (s === 'Egpu Enclosures') return 'other';
    if (s === 'Laptop Accessories') return 'other';
    if (s === 'Vr Headsets') return 'headset';
    if (s === 'Gaming Mousepads') return 'other';
    if (s === 'Aorus Gigabyte') return 'other';
    // fall through to globals
  }

  // ==================== BERMOR TECHZONE ====================
  if (storeName === 'Bermor Techzone') {
    // Laptops
    if (s.includes('LAPTOP') || s.includes('Laptop')) return 'laptop';
    // Processors
    if (s.includes('Intel Processors') || s.includes('AMD Processors')) return 'cpu';
    // Motherboards
    if (s.includes('Motherboards')) return 'motherboard';
    // Video Cards / GPU
    if (s.includes('Video Cards') || s.includes('Nvidia') || s.includes('AMD Video')) return 'gpu';
    // Storage
    if (s.includes('Storage Devices') || s.includes('Solid State Drives') ||
        s.includes('External Storage Drives') || s.includes('Internal Hard Drives') ||
        s.includes('Flash Drives') || s.includes('Memory Card')) return 'storage';
    // RAM / Memory Modules
    if (s.includes('Memory Modules')) return 'ram';
    // Cooling
    if (s.includes('CPU AIO Liquid Cooling') || s.includes('CPU Aircooling') ||
        s.includes('Watercooling') || s.includes('Fans/Hubs') ||
        s.includes('Cooling Systems')) return 'cpu_cooler';
    // Monitors
    if (s.includes('Monitors')) return 'monitor';
    // Accessories
    if (s.includes('Computer Accessories > Keyboard')) return 'keyboard';
    if (s.includes('Computer Accessories > Mouse') || s.includes('Mouse/Mousepad')) return 'mouse';
    if (s.includes('Computer Accessories > Headsets')) return 'headset';
    if (s.includes('Computer Accessories > Speaker')) return 'speaker';
    if (s.includes('Computer Accessories > Webcam')) return 'camera';
    if (s.includes('Joystick') || s.includes('Joystick/Gamepad')) return 'controller';
    // Networking
    if (s.includes('Networking Materials') || s.includes('Router') ||
        s.includes('Switch/Hub') || s.includes('Network Antennas')) return 'network';
    // PSU
    if (s.includes('Power Supply Unit')) return 'psu';
    // Case / Chassis
    if (s.includes('Chassis')) return 'case';
    // Desktop builds
    if (s.includes('DESKTOP PACKAGES') || s.includes('Consumer Desktop') ||
        s.includes('PC Builds') || s.includes('Desktop')) return 'desktop';
    // Camera / CCTV
    if (s.includes('CCTV Camera') || s.includes('Camera and Gears') ||
        s.includes('Camera > Camera')) return 'camera';
    if (s.includes('CCTV & Securities')) return 'camera';
    // Furniture
    if (s.includes('Gaming Chair')) return 'chair';
    if (s.includes('Table')) return 'table';
    // Power / UPS
    if (s.includes('UPS/AVR')) return 'ups';
    if (s.includes('Power Sources > UPS')) return 'ups';
    // Printers
    if (s.includes('Printers')) return 'printer';
    // Tablet
    if (s.includes('Tablet')) return 'tablet';
    // Cables/Adapters
    if (s.includes('Cables/Adapter') || s.includes('Cables/Adapters') ||
        s.includes('Cables >')) return 'adapter';
    // Handhelds
    if (s.includes('Handhelds')) return 'other';
    // Software
    if (s.includes('Softwares')) return 'software';
    // Brand groups -> other
    if (s.includes('BTZ Deals')) return 'other';
    // Audio
    if (s.includes('Audio Gears') || s.includes('Speaker/Soundbar')) return 'speaker';
    // Others
    if (s.includes('Appliances') || s.includes('Mobile Phones') ||
        s.includes('Gadgets & Accessories') || s.includes('Furnitures')) return 'other';
    // fall through
  }

  // ==================== COMPLINK ====================
  if (storeName === 'Complink') {
    if (s === 'Desktops' || s === 'Desktop') return 'desktop';
    if (s === 'Mobility') {
      // Mobility includes laptops, tablets. Check sub-categories from context
      return 'laptop';  // Default to laptop; may also include tablets
    }
    if (s === 'Network Devices') return 'network';
    if (s === 'Peripherals') return 'other';
    if (s === 'Printers & Scanners') return 'printer';
    if (s === 'Smartphones') return 'other';
    // fall through
  }

  // ==================== DATABLITZ ====================
  if (storeName === 'DataBlitz') {
    // Games go to other
    if (s.includes('Games') || s.includes('Collection') || s.includes('Bundle')) return 'other';
    // Laptops
    if (s.includes('Gaming Laptop')) return 'laptop';
    if (s.includes('Computer Gaming Laptop')) return 'laptop';
    if (s.includes('Computer Non-Gaming Laptop')) return 'laptop';
    if (s.includes('Mini PC')) return 'desktop';  // Mini PC is a small desktop
    // Desktops
    if (s.includes('Desktop Computers')) return 'desktop';
    if (s.includes('Barebones')) return 'desktop';
    // Processors
    if (s.includes('Computer Processors')) return 'cpu';
    // RAM
    if (s.includes('Computer RAM') || s.includes('Memory')) return 'ram';
    // GPU
    if (s.includes('Graphics Card') || s.includes('Asus Graphics Card') ||
        s.includes('Colorful Graphics Card') || s.includes('Video Cards & Adapters')) return 'gpu';
    // Storage
    if (s.includes('Internal SSD') || s.includes('External SSD') ||
        s.includes('HDD') || s.includes('Data Storage Systems') ||
        s.includes('Flash Drive') || s.includes('External Storage Devices') ||
        s.includes('Storage Devices')) return 'storage';
    // Motherboard (implied from PC Parts)
    if (s.includes('PC Parts')) return 'other';
    // Cooling (Cooler Master)
    if (s.includes('Cooler Master')) return 'cpu_cooler';
    if (s.includes('Cooling Fans/ Systems')) return 'cpu_cooler';
    // Power Supply
    if (s.includes('Power Supply') || s.includes('Cooler Master Power Supply') ||
        s.includes('Deepcool Power Supply')) return 'psu';
    // Peripherals
    if (s.includes('Keyboards')) return 'keyboard';
    if (s.includes('Mouse')) return 'mouse';
    if (s.includes('Gaming Headset') || s.includes('Headset') || s.includes('Epos Gaming Headset')) return 'headset';
    if (s.includes('Speakers')) return 'speaker';
    if (s.includes('Controller') || s.includes('Game Controller')) return 'gamepad';
    if (s.includes('Microphone')) return 'microphone';
    // Monitors
    if (s.includes('Gaming Monitor')) return 'monitor';
    if (s.includes('Non-Gaming Monitor')) return 'monitor';
    // Monitors? Actually no Monitors category in DataBlitz
    // Software
    if (s.includes('Software')) return 'software';
    // Cables/Adapters
    if (s.includes('Adapter') || s.includes('Adapters & Cables') ||
        s.includes('Adapters, Cables and Hubs')) return 'cable';
    // Misc
    if (s.includes('Bag') || s.includes('Carrying Case')) return 'sleeve-bag';
    if (s.includes('Chair')) return 'chair';
    if (s.includes('UPS')) return 'ups';
    if (s.includes('Table')) return 'table';
    if (s.includes('Tablet')) return 'tablet';
    // Brand categories -> other
    if (['ASUS','CORSAIR','G.Skill','Ducky','Cooler Master','Corsair | Elgato','Colorful',
         'Dragonwar','E-YOOSO','Finalmouse','FILCO','BOBOVR','ELGATO','EPOS','Dra peripheral'
        ].some(b => s.includes(b))) return 'other';
    if (s.startsWith('Category -') || s.startsWith('FOR UNTAGGING') ||
        s.startsWith('LEGACY ITEMS')) return 'other';
    // fall through
  }

  // ==================== DYNAQUEST PC ====================
  if (storeName === 'DynaQuest PC') {
    if (s === 'Access Point / Range Extender') return 'network';
    if (s === 'Adapter' || s === 'adapter') return 'adapter';
    if (s === 'Air Cooler') return 'cpu_cooler';
    if (s === 'AIO Cooler') return 'cpu_cooler';
    if (s === 'Apparel | Wearable') return 'apparel';
    if (s === 'Audio') return 'headset';  // Gaming headset
    if (s === 'Batteries & Chargers') return 'battery';
    if (s === 'CCTV') return 'camera';
    if (s === 'Cabling Solutions') return 'cable';
    if (s === 'Chassis' || s === 'chassis' || s === 'casing') return 'case';
    if (s === 'Cleaning Solutions') return 'cleaning-solution';
    if (s === 'Cooling Solutions') return 'cpu_cooler';
    if (s === 'Digital Camera') return 'camera';
    if (s === 'Display' || s === 'display') return 'monitor';
    if (s === 'Game Controller') return 'controller';
    if (s === 'Gaming Combo') return 'other';
    if (s === 'Gaming Headset') return 'headset';
    if (s === 'Gaming Keyboard') return 'keyboard';
    if (s === 'Gaming Mouse') return 'mouse';
    if (s === 'Gaming Mouse Pad') return 'mouse';
    if (s === 'Graphics Card') return 'gpu';
    if (s === 'HDD Dock / Enclosure / Caddy') return 'enclosure';
    if (s === 'HDD External' || s === 'HDD SSD') return 'external-storage';
    if (s === 'HDD Internal' || s === 'Hdd Internal') return 'storage';
    if (s === 'Ink' || s === 'Ink Toner') return 'printer';
    if (s === 'Keyboard' || s === 'Keyboard / Mouse') return 'keyboard';
    if (s === 'LAN Card') return 'other';
    if (s === 'Lightings | Bracket | Mod') return 'other';
    if (s === 'March Deals') return 'other';
    if (s === 'Media Player') return 'media-player';
    if (s === 'Memory Devices') return 'other';
    if (s === 'Microphones') return 'microphone';
    if (s === 'Mini-PC') return 'other';
    if (s === 'Mobile') return 'other';
    if (s === 'Mobile Accessories') return 'other';
    if (s === 'Monitor') return 'monitor';
    if (s === 'Motherboard' || s === 'Motherboards') return 'motherboard';
    if (s === 'Mouse' || s === 'Mouse Pad') return 'mouse';
    if (s === 'Network Attached Storage') return 'network';
    if (s === 'Notebook' || s === 'Notebooks') return 'laptop';
    if (s === 'Office Furniture') return 'office-furniture';
    if (s === 'PSU' || s === 'Psu' || s === 'psu') return 'psu';
    if (s === 'Package Desktop') return 'desktop';
    if (s === 'Printer' || s === 'Printer / Scanner' || s === 'Printing / Office Supplies') return 'printer';
    if (s === 'Processor') return 'cpu';
    if (s === 'RAM' || s === 'Ram' || s === 'ram') return 'ram';
    if (s === 'Rack') return 'other';
    if (s === 'Router') return 'network';
    if (s === 'Sleeves / Bags') return 'sleeve-bag';
    if (s === 'Software') return 'software';
    if (s === 'Streaming Device') return 'media-player';
    if (s === 'Switch') return 'other';
    if (s === 'UPS') return 'ups';
    if (s === 'USB Hub / Card Reader') return 'hub';
    if (s === 'UTP Cable') return 'cable';
    if (s === 'Webcam') return 'camera';
    if (s === 'Wellness') return 'other';
    if (s === 'ssd m.2' || s === 'ssd m2') return 'storage';
    if (s === 'Access Point / Range Extender') return 'network';
    if (s === 'Ink Toner') return 'printer';
    // fall through
  }

  // ==================== EASYPC ====================
  if (storeName === 'EasyPC') {
    if (s === 'PROCESSOR AMD' || s === 'PROCESSOR INTEL' || s === 'PROCESSOR' ||
        s === 'Processor AMD' || s === 'Processor' || s === 'Processor INTEL') return 'cpu';
    if (s === 'EARPHONES') return 'headset';
    if (s === 'BUNDLES' || s === 'COMBO' || s === 'COMBO SET' ||
        s === 'PC BUNDLE' || s === 'ACCESSORIES') return 'other';
    if (s === 'DESKTOP BUNDLE' || s === 'DESKTOP COMPUTER' || s === 'DESKTOP PACKAGE' ||
        s === 'GAMING DESKTOP' || s === 'Branded PC') return 'desktop';
    if (s === 'CABLES & ADAPTERS' || s === 'Cable') return 'cable';
    if (s === 'CAMERA' || s === 'CCTV') return 'camera';
    if (s === 'CHAIR' || s === 'GAMING CHAIR') return 'chair';
    if (s === 'CHASSIS FAN') return 'fan';
    if (s === 'COOLING' || s === 'CPU COOLING' || s === 'CPU Cooling' || s === 'Cooling') return 'cpu_cooler';
    if (s === 'DISPLAY' || s === 'Display' || s === 'MONITOR' || s === 'Monitor') return 'monitor';
    if (s === 'EARPHONES') return 'headset';
    if (s === 'EXTERNAL SOLID STATE DRIVE' || s === 'EXTERNAL STORAGE' ||
        s === 'EXTERNAL STORAGE DEVICES' || s === 'External Storage Devices') return 'external-storage';
    if (s === 'GAMING ACCESSORIES') return 'other';
    if (s === 'GAMING HEADSET' || s === 'Gaming Headset' || s === 'HEADSET' || s === 'Headset') return 'headset';
    if (s === 'GAMING KEYBOARD' || s === 'Gaming Keyboard' || s === 'KEYBOARD' || s === 'Keyboard') return 'keyboard';
    if (s === 'GAMING LAPTOP' || s === 'Gaming Laptop' || s === 'Laptop' ||
        s === 'LAPTOP' || s === 'PRODUCTIVITY LAPTOP' || s === 'NOTEBOOK LAPTOP') return 'laptop';
    if (s === 'GAMING MOUSE' || s === 'Gaming Mouse' || s === 'MOUSE' || s === 'Mouse') return 'mouse';
    if (s === 'MEMORY') return 'ram';
    if (s === 'GRAPHIC CARD' || s === 'GRAPHICS CARD' || s === 'Graphic card' ||
        s === 'Graphics Card') return 'gpu';
    if (s === 'Keyboards') return 'keyboard';
    if (s === 'HEADSET ACCESSORIES') return 'other';
    if (s === 'KEYCAPS') return 'other';
    if (s === 'MICROPHONE') return 'microphone';
    if (s === 'MINI PC') return 'desktop';
    if (s === 'MOTHERBOARD' || s === 'Motherboard') return 'motherboard';
    if (s === 'MICROPHONE') return 'microphone';
    if (s === 'NETWORK DEVICE') return 'network';
    if (s === 'OFFICE CHAIR') return 'chair';
    if (s === 'OFFICE PRODUCTIVITY') return 'other';
    if (s === 'OPERATING SYSTEM') return 'software';
    if (s === 'PC CASE' || s === 'PC Case' || s === 'PC CASE') return 'case';
    if (s === 'POWER BANK') return 'powerbank';
    if (s === 'POWER SUPPLY' || s === 'Power Supply') return 'psu';
    if (s === 'PRINTERS & SCANNER') return 'printer';
    if (s === 'PROJECTOR') return 'projector';
    if (s === 'SOLID STATE DRIVE' || s === 'Solid State Drive' || s === 'STORAGE' ||
        s === 'Storage' || s === 'STORAGE DEVICES' || s === 'HARD DISK' || s === 'HDD') return 'storage';
    if (s === 'SPEAKER') return 'speaker';
    if (s === 'TABLE' || s === 'Table') return 'table';
    if (s === 'TABLET') return 'tablet';
    if (s === 'THERMAL GREASE') return 'other';
    if (s === 'UPS' || s === 'UPS & AVR') return 'ups';
    if (s === 'WEB & DIGITAL CAMERA' || s === 'WEBCAM' || s === 'Webcam') return 'camera';
    if (s === 'Wireless Routers') return 'network';
    if (s === 'memory') return 'ram';
    // fall through
  }

  // ==================== ELECTROWORLD ====================
  if (storeName === 'Electroworld') {
    // Electroworld categories are complex paths with ">" delimiter. Extract meaningful keywords.
    if (s.toLowerCase().includes('laptop')) return 'laptop';
    if (s.toLowerCase().includes('monitor')) return 'monitor';
    if (s.toLowerCase().includes('tv')) return 'other';  // TV not in our frontend categories
    if (s.toLowerCase().includes('logitech')) {
      if (s.toLowerCase().includes('headphone') || s.toLowerCase().includes('headset')) return 'headset';
      if (s.toLowerCase().includes('input device') || s.toLowerCase().includes('mouse') || s.toLowerCase().includes('keyboard')) return 'keyboard'; // Logitech keyboards mapped from INPUT DEVICE path
      return 'other';
    }
    if (s.toLowerCase().includes('gaming') && s.toLowerCase().includes('laptop')) return 'laptop';
    if (s.toLowerCase().includes('input device')) return 'keyboard';  // Input device includes keyboards
    if (s.toLowerCase().includes('output device')) {
      if (s.toLowerCase().includes('headphone') || s.toLowerCase().includes('headset')) return 'headset';
      return 'other';
    }
    if (s.toLowerCase().includes('wire connector')) return 'cable';
    if (s.toLowerCase().includes('asus')) return 'other';
    if (s.toLowerCase().includes('lenovo')) return 'laptop';
    if (s.toLowerCase().includes('hp')) return 'laptop';
    if (s.toLowerCase().includes('mobile')) return 'other';
    if (s.toLowerCase().includes('camera') || s.toLowerCase().includes('webcam')) return 'camera';
    if (s.toLowerCase().includes('software')) return 'software';
    if (s.toLowerCase().includes('microphone')) return 'microphone';
    if (s.toLowerCase().includes('printer')) return 'printer';
    if (s.toLowerCase().includes('speaker')) return 'speaker';
    if (s.toLowerCase().includes('router')) return 'network';
    if (s.toLowerCase().includes('network') || s.toLowerCase().includes('ethernet')) return 'network';
    if (s.toLowerCase().includes('ugreen')) return 'cable';
    if (s.toLowerCase().includes('promate')) return 'cable';
    if (s.toLowerCase().includes('epson')) {
      if (s.toLowerCase().includes('projector')) return 'projector';
      return 'printer';
    }
    if (s.toLowerCase().includes('lg')) {
      if (s.toLowerCase().includes('monitor')) return 'monitor';
      return 'other';
    }
    // fall through
  }

  // ==================== GIGAHERTZ ====================
  if (storeName === 'Gigahertz') {
    if (s === 'LAPTOP' || s === 'Laptop' || s.includes('Laptop')) return 'laptop';
    if (s === 'DESKTOP') return 'desktop';
    if (s === 'MONITOR' || s === 'Monitors' || s === 'Display Adapter' || s === 'LCD') return 'monitor';
    if (s === 'MOUSE' || s === 'Mouse') return 'mouse';
    if (s === 'KEYBOARD' || s === 'Keyboard') return 'keyboard';
    if (s === 'Keyboard And Mouse Combo') return 'other';
    if (s === 'HEADSET' || s === 'HEADPHONES' || s === 'Ear Buds' || s === 'Earphone' || s === 'Bluetooth Audio') return 'headset';
    if (s === 'Speakers' || s === 'Bluetooth Speaker') return 'speaker';
    if (s === 'PRINTER' || s === 'Printer') return 'printer';
    if (s === 'Solid State Drive' || s === 'External Solid State Drive' || s === 'HDD' ||
        s === 'EXTERNAL DRIVE' || s === 'Storage' || s === 'Memory') return 'storage';
    if (s === 'RAM' || s === 'MEMORY' || s === 'SODIMM') return 'ram';
    if (s === 'VGA Cable') return 'gpu';  // Legacy naming
    if (s === 'ENCLOSURE') return 'enclosure';
    if (s === 'Fan' || s === 'FAN' || s === 'Electric Fan') {
      // Electric fan is actual fan, not PC fan - check context
      return s === 'Electric Fan' ? 'other' : 'cpu_cooler';
    }
    if (s === 'BOTTOM CASE') return 'case';
    if (s === 'Thermal Paste') return 'other';
    if (s === 'NETWORK') return 'network';
    if (s === 'Router' || s === 'Network Adapter') return 'network';
    if (s === 'Network Cable') return 'cable';
    if (s === 'Adapter' || s === 'Display Adapter') return 'adapter';
    if (s === 'Cable' || s === 'Cables' || s === 'USB Cable' || s === 'HDMI Cable' ||
        s === 'Type-C Cable' || s === 'OTG Cable' || s === 'VGA Cable') return 'cable';
    if (s === 'Battery') return 'battery';
    if (s === 'Power Bank') return 'powerbank';
    if (s === 'Charger' || s === 'Wireless Charger') return 'cable';
    if (s === 'TABLET' || s === 'Tablet') return 'tablet';
    if (s === 'MOBILE') return 'other';
    if (s === 'Camera' || s === 'WEBCAM' || s === 'Security Camera') return 'camera';
    if (s === 'Controller' || s === 'Switch' || s === 'Gamepad') return 'gamepad';
    if (s === 'CONSOLES') return 'other';
    if (s === 'Bluetooth Selfie Stick') return 'other';
    if (s === 'Hub') return 'hub';
    if (s === 'SOFTWARE' || s === 'Accessories') return 'other';
    if (s === 'Hinge' || s === 'Hinge Cover' || s === 'LCD Bezel' || s === 'LCD Cover') return 'other';
    if (s === 'Lamp' || s === 'Screen Cleaner' || s === 'Tempered Glass') return 'other';
    if (s === 'Door Bell') return 'other';
    // Promotional categories
    if (s.includes('Delivery') || s.includes('Promo') || s.includes('Sale') ||
        s.includes('Picks') || s.includes('Top Selling') || s.includes('marketing')) return 'other';
    // fall through
  }

  // ==================== ITECH ====================
  if (storeName === 'iTech') {
    if (s === 'Keyboard') return 'keyboard';
    if (s === 'Gaming Keyboards') return 'keyboard';
    if (s === 'Computer Components') return 'cpu';  // Per instructions: map to cpu
    if (s === 'Asus Laptops Laptops') return 'laptop';
    if (s === 'Laptop Accessories') return 'other';
    if (s === 'External Memory Drive') return 'external-storage';
    if (s === 'Flash Drives Storage') return 'storage';
    if (s === 'Sd Micro Sd Card Storage') return 'storage';
    if (s === 'Chassis System Box') return 'case';
    if (s === 'Gaming Mouse') return 'mouse';
    if (s === 'Gaming Keyboards') return 'keyboard';
    if (s === 'Headset Gaming Peripherals' || s === 'Home And Office Headsets') return 'headset';
    if (s === 'Acer Laptops') return 'laptop';
    if (s === 'Asus Laptops') return 'laptop';
    if (s === 'Asus Monitors') return 'monitor';
    if (s === 'Asus Routers') return 'network';
    if (s === 'Gamepads And Controllers' || s === 'Gamepad') return 'gamepad';
    if (s === 'Gaming Mousepads') return 'other';
    if (s === 'Hp Laptops') return 'laptop';
    if (s === 'Ip Wifi Camera' || s === 'IP Camera') return 'camera';
    if (s === 'Apple Accessories') return 'cable';
    if (s === 'Digital Codes') return 'other';
    if (s === 'Other Products') return 'other';
    if (s === 'Apple Macbook') return 'laptop';
    if (s === 'Monitors') return 'monitor';
    if (s === 'Laptops') return 'laptop';
    if (s === 'Others' || s === 'Peripherals') return 'other';
    if (s === 'Preorder') return 'other';
    if (s === 'Rog Ally' || s === 'Rog Phone Mobile Phones') return 'other';
    if (s === 'Hyperx Peripherals') return 'other';
    if (s === 'Logitech Office' || s === 'Logitech Peripherals') return 'other';
    if (s === 'Mobile Phones') return 'other';
    if (s === 'Mouse Office Peripherals') return 'mouse';
    if (s === 'Msi Laptops') return 'laptop';
    if (s === 'Networking') return 'network';
    if (s === 'Nintendo Switch') return 'other';
    if (s === 'Office Peripherals') return 'other';
    if (s === 'Fantech') return 'other';
    if (s === 'Lenovo Pc Components') return 'cpu';
    if (s === 'Lg') return 'other';
    if (s === 'Sd Micro Sd Card Storage') return 'storage';
    if (s.endsWith('Peripherals')) return 'other';
    // fall through
  }

  // ==================== OCTAGON ====================
  if (storeName === 'Octagon') {
    // Audio
    if (s === 'Speaker' || s === 'Speakers') return 'speaker';
    if (s === 'Headphone' || s === 'Headphones' || s === 'Earphone' || s === 'Earphones') return 'headset';
    // Gaming peripherals
    if (s === 'Gaming Mouse') return 'mouse';
    if (s === 'Gaming Keyboard') return 'keyboard';
    if (s === 'Gaming Headset') return 'headset';
    if (s === 'Gaming Chair') return 'other';  // Chair category exists but mapping to other per script
    // Core PC components
    if (s === 'Laptop' || s === 'Laptops' || s === 'gaming laptop' || s === 'ACER ALL-IN-ONE COMPUTER') return 'laptop';
    if (s === 'Keyboard') return 'keyboard';
    if (s === 'Mouse') return 'mouse';
    if (s === 'Graphics Card') return 'gpu';
    if (s === 'Power Supply') return 'psu';
    if (s === 'SSD') return 'storage';
    if (s === 'Hard Drives') return 'storage';
    if (s === 'Monitor') return 'monitor';
    if (s === 'Computer Processors') return 'cpu';
    if (s === 'Cooling Fan' || s === 'Cooling Fans' || s === 'Fan' || s === 'Fans') return 'cpu_cooler';
    // Cables/Adapters
    if (s === 'Charger' || s === 'Chargers' || s === 'Adapter' || s === 'Adapters' ||
        s === 'Cable' || s === 'Cables') return 'cable';
    // Misc items
    if (s === 'Webcam') return 'camera';
    if (s === 'Microphone') return 'microphone';
    if (s === 'Tablet') return 'tablet';
    if (s === 'Console') return 'other';
    if (s === 'Mobile Phones') return 'other';
    if (s === 'Power Bank') return 'powerbank';
    if (s === 'Printer') return 'printer';
    if (s === 'Ink Bottle') return 'other';
    if (s === 'Keyboard and Mouse') return 'other';
    if (s === 'Logitech') return 'other';
    if (s === 'Razer') return 'other';
    if (s === 'ADAPTER' || s === 'AVR and UPS') return 'other';
    if (s === 'CCTV') return 'camera';
    if (s === 'Cleaning kit') return 'cleaning-solution';
    if (s === 'Duster Spray') return 'other';
    if (s === 'EARBUDS') return 'headset';
    if (s === 'Expansion portable hard drive') return 'storage';
    if (s === 'Extension') return 'cable';
    if (s === 'HP printhead') return 'other';
    if (s === 'Ink Cartridge') return 'other';
    if (s === 'Numeric Keypads') return 'other';
    if (s === 'POWER SYSTEM') return 'other';
    if (s === 'Portable hard drive') return 'storage';
    if (s === 'Smart Watch') return 'other';
    if (s === 'USB Port') return 'other';
    if (s === 'Wearable Devices') return 'other';
    if (s === 'Work From Home') return 'other';
    if (s === 'adapter') return 'adapter';
    if (s === 'computer') return 'other';
    if (s === 'm') return 'other';
    // fall through
  }

  // ==================== PCWORX ====================
  if (storeName === 'PCWorx') {
    // --- PRIORITY CHECKS: specific patterns before generic keywords ---
    // Gaming laptops (before generic Laptop)
    if (s.includes('Gaming Laptop')) return 'laptop';
    // Laptops / Notebooks
    if (s.includes('Laptop') || s.includes('LAPTOP') || s.includes('Notebook')) return 'laptop';
    // Apple products - specific first
    if (s === 'Apple Macbook' || s === 'Macbook' || s === 'MacBook' || s === 'MacBook Air' ||
        s === 'MacBook Pro') return 'laptop';
    if (s === 'iPad' || s === 'Ipad' || s === 'iPhone' || s === 'Iphone' || s.includes('iPad')) return 'tablet';
    // CPU Cooler - BEFORE generic CPU check
    if (s.includes('CPU Cooler') || s.includes('Watercooling') || s.includes('Liquid Cooler') ||
        s.includes('AIO Cooler') || s.includes('cpu_cooler')) return 'cpu_cooler';
    // Cooling fans
    if (s.includes('Cooling Fan')) return 'cpu_cooler';
    // Memory card/sd variants (storage)
    if (s.includes('Memory Card') || s.includes('MICRO SD') || s.includes('Micro SD') ||
        s.includes('Memory Stick') || s.includes('SDXC') || s.includes('SDHC') || s.includes('SD Card')) {
      return 'memory-card';
    }
    // External/portable storage
    if (s.includes('External SSD') || s.includes('External Drive') || s.includes('Portable SSD')) {
      return 'external-storage';
    }
    // Headset before generic "phone" catch
    if (s.includes('Gaming Headset') || s.includes('Headset') || s.includes('Headphone')) return 'headset';
    if (s.includes('Speaker') || s.includes('Soundbar') || s.includes('JBL') || s.includes('Edifier')) return 'speaker';
    if (s.includes('Controller') || s.includes('Gamepad')) return 'gamepad';
    if (s.includes('Food Processor')) return 'other';
    // Display products (before generic includes('monitor') at bottom)
    if (s.includes('Display Port')) return 'monitor';
    // HD versions
    if (s === 'HD 1080p' || s === 'HD 4K') return 'other';
    // Networking & Cables
    if (s.includes('NETWORKING') || s.includes('Network') || s.includes('Adapter') ||
        s.includes('CABLE') || s.includes('cable') || s.includes('USB') || s.includes('HDMI')) return 'cable';
    if (s.includes('Router') || s.includes('WiFi') || s.includes('WIFI') ||
        s.includes('Switch') || s.includes('Switch box')) return 'network';
    if (s.includes('Hub') || s.includes('Hub')) return 'hub';
    if (s.includes('Dongle') || s.includes('Receiver')) return 'adapter';
    // Printers
    if (s.includes('Printer')) return 'printer';
    // Tablets
    if (s.includes('Tablet') || s.includes('IPAD') || s.includes('Ipad')) return 'tablet';
    // Tablets
    if (s.includes('IP Camera')) return 'camera';
    if (s.includes('Camera') || s.includes('Dashcam') || s.includes('IP Camera') ||
        s.includes('CCTV') || s.includes('Security') || s.includes('Surveillance')) return 'camera';
    // Samsung brand -> other
    if (s.includes('Samsung') || s.includes('Sandisk') || s.includes('Teamgroup') ||
        s.includes('Kingston') || s.includes('Transcend') || s.includes('Netac') ||
        s.includes('Palit') || s.includes('Inno3d') || s.includes('Colorful') ||
        s.includes('Gigabyte') || s.includes('MSI') || s.includes('ASUS') ||
        s.includes('Acer') || s.includes('Lenovo') || s.includes('HP') ||
        s.includes('Aula') || s.includes('Fantech') || s.includes('Rapoo') ||
        s.includes('Redragon') || s.includes('Tecware') || s.includes('Gamepad') ||
        s.includes('Controller') || s.includes('Keyboard') || s.includes('Mouse') ||
        s.includes('MSI') || s.includes('Xbox') || s.includes('Xencelabs') ||
        s.includes('Wacom') || s.includes('Ugee') || s.includes('Label') ||
        s.includes('Scanner') || s.includes('Scanner') || s.includes('Gaming') ||
        s.includes('Software') || s.includes('Accessory') || s.includes('Parts')) {
      if (!s.toLowerCase().includes('keyboard') && !s.toLowerCase().includes('mouse') &&
          !s.toLowerCase().includes('gpu') && !s.toLowerCase().includes('processor') &&
          !s.toLowerCase().includes('ram') && !s.toLowerCase().includes('monitor') &&
          !s.toLowerCase().includes('laptop') && !s.toLowerCase().includes('desktop') &&
          !s.toLowerCase().includes('storage') && !s.toLowerCase().includes('psu') &&
          !s.toLowerCase().includes('case') && !s.toLowerCase().includes('cooler') &&
          !s.toLowerCase().includes('motherboard') && !s.toLowerCase().includes('camera')) {
        return 'other';
      }
    }
    // Speakers
    if (s.includes('Speaker') || s.includes('Sound') || s.includes('JBL') ||
        s.includes('EDIFIER')) return 'speaker';
    // UPS
    if (s.includes('UPS')) return 'ups';
    // Microphone
    if (s.includes('Mic') || s.includes('Microphone') || s.includes('Stream')) return 'microphone';
    // Projectors
    if (s.includes('Projector')) return 'projector';
    // Drawing tablets
    if (s.includes('Tablet') || s.includes('Pen Tablet')) return 'tablet';
    // fall through
  }

  // ==================== PC EXPRESS ====================
  if (storeName === 'PC Express') {
    // The existing rules are already quite comprehensive
    if (s === 'Laptops' || s === 'Gaming Laptops') return 'laptop';
    if (s === 'Graphics Cards' || s === 'Graphics Card') return 'gpu';
    if (s === 'Motherboards' || s === 'Motherboard') return 'motherboard';
    if (s === 'Bluetooth Speakers') return 'speaker';
    if (s === 'Power Supplies') return 'psu';
    if (s === 'Gaming Monitors' || s === 'Monitor' || s === 'Monitors') return 'monitor';
    if (s === 'Desktop PCs' || s === 'Desktop PC') return 'desktop';
    if (s === 'UDIMM' || s === 'SODIMM') return 'ram';
    if (s === 'Solid State Drives (SSD)' || s === 'External Storage Devices' ||
        s === 'Traditional Hard Drives' || s === 'Hard Drive' || s === 'Hard Drives') return 'storage';
    if (s === 'Label Makers') return 'other';
    if (s === 'Flash Memory Cards') return 'memory-card';
    if (s === 'Video Game Consoles' || s === 'Game Consoles') return 'other';
    if (s === 'Smartphones') return 'other';
    if (s === 'Ink Bottles') return 'other';
    if (s === 'Cables' || s === 'HDMI Cables') return 'cable';
    if (s === 'Adapters') return 'cable';
    if (s === 'Gaming Chairs') return 'chair';
    if (s === 'Handheld Fan') return 'cpu_cooler';
    if (s === 'Office Application Software') return 'software';
    if (s === 'Projectors') return 'projector';
    if (s === 'Network Attached Storage (NAS)' || s === 'NAS') return 'external-storage';
    if (s === 'Computer System Cooling Parts') return 'cpu_cooler';
    if (s === 'CPU Air Coolers') return 'cpu_cooler';
    if (s === 'AI Liquid Coolers') return 'cpu_cooler';
    if (s === 'PC Case') return 'case';
    // Additional mappings from raw categories
    if (s.includes('Gaming Case')) return 'case';
    if (s.includes('RGB') && s.includes('Fan')) return 'cpu_cooler';
    if (s.includes('Memory') && !s.includes('Card')) return 'ram';
    // fall through
  }

  // ==================== SILICON VALLEY ====================
  if (storeName === 'Silicon Valley') {
    if (s === 'Airpods') return 'headset';
    if (s === 'All In One Desktop') return 'desktop';
    if (s === 'Business Laptop' || s === 'Mainstream Laptop' || s === 'Premium Laptop') return 'laptop';
    if (s === 'Desktop Bundle') return 'desktop';
    if (s === 'Dvd Writer') return 'other';
    if (s === 'External Ssd') return 'storage';
    if (s === 'Flash Drive') return 'storage';
    if (s === 'Gaming Desktop' || s === 'Gaming Laptop') return s.includes('Desktop') ? 'desktop' : 'laptop';
    if (s === 'Gaming Monitor') return 'monitor';
    if (s === 'Gaming Mouse') return 'mouse';
    if (s === 'Internal Ssd') return 'storage';
    if (s === 'Keyboard Mouse Combo') return 'other';
    if (s === 'Laptops') return 'laptop';
    if (s === 'Mac' || s === 'Macbook') return 'laptop';
    if (s === 'Magnetic Power Bank') return 'powerbank';
    if (s === 'Microsd Card') return 'memory-card';
    if (s === 'Monitor') return 'monitor';
    if (s === 'Motherboard') return 'motherboard';
    if (s === 'Otg Flash Drive') return 'storage';
    if (s === 'Power Bank') return 'powerbank';
    if (s === 'Processor') return 'cpu';
    if (s === 'Projector') return 'projector';
    if (s === 'Screen Protector') return 'other';
    if (s === 'Tower Desktop') return 'desktop';
    if (s === 'Uncategorized') return 'other';
    if (s === 'Ups') return 'ups';
    if (s === 'Usb Cable') return 'cable';
    if (s === 'Wall Charger') return 'cable';
    if (s === 'Wired Headset') return 'headset';
    if (s === 'Wired Keyboard') return 'keyboard';
    if (s === 'Wired Mouse') return 'mouse';
    if (s === 'Wireless Mouse') return 'mouse';
    // fall through
  }

  // ==================== VILLMAN ====================
  if (storeName === 'VillMan') {
    if (s === 'Processors' || s === 'Processor' || s === 'PROCESSOR') return 'cpu';
    if (s === 'all in one pcs' || s === 'All In One PCs') return 'desktop';
    if (s === 'All In One Printers' || s === 'All-In-One Printer') return 'printer';
    if (s === 'USB Flash Drives' || s === 'USB Flash Drive') return 'storage';
    if (s === 'Notebook PCs' || s === 'Notebook PC') return 'laptop';
    if (s === 'Desktop PCs' || s === 'Desktop PC') return 'desktop';
    if (s === '2 in 1 pcs' || s === '2 In 1 PCs' || s === '2 In 1 pcs' ||
        s === 'surface' || s === 'Surface') return 'laptop';
    if (s === 'Handheld' || s === 'handheld gaming pcs') return 'other';
    if (s === 'Power Supplies') return 'psu';
    if (s === 'Access Points') return 'network';
    if (s === 'USB Hubs') return 'hub';
    if (s === 'Mobile Broadband') return 'network';
    if (s === 'Laser Printers') return 'printer';
    if (s === 'Memory Card Readers') return 'storage';
    if (s === 'cables') return 'cable';
    if (s === 'HDDs Notebook PCs') return 'storage';
    if (s === 'Motherboards') return 'motherboard';
    if (s === 'GPU') return 'gpu';
    if (s === 'Desktop RAM') return 'ram';
    if (s === 'Notebook RAM') return 'ram';
    if (s === 'Bags Sleeves Cases') return 'sleeve-bag';
    if (s === 'Batteries Chargers') return 'battery';
    if (s === 'Broadband Routers') return 'network';
    if (s === 'CPU Coolers') return 'cpu_cooler';
    if (s === 'Desktop External HDDs') return 'external-storage';
    if (s === 'Desktop PCs') return 'desktop';
    if (s === 'Dot Matrix Printers') return 'printer';
    if (s === 'Drawing Tablets') return 'tablet';
    if (s === 'Headphones Headsets') return 'headset';
    if (s === 'Ink Cartridges') return 'printer';
    if (s === 'Inkjet Printers') return 'printer';
    if (s === 'Keyboard Mouse Combo') return 'other';
    if (s === 'Keyboards') return 'keyboard';
    if (s === 'Memory Cards') return 'memory-card';
    if (s === 'Monitors') return 'monitor';
    if (s === 'Mouse') return 'mouse';
    if (s === 'Network Accessories') return 'network';
    if (s === 'Network Adapters') return 'network';
    if (s === 'Network Attached Storage') return 'external-storage';
    if (s === 'Network Switches') return 'network';
    if (s === 'Notebook Accessories') return 'other';
    if (s === 'Notebook PCs') return 'laptop';
    if (s === 'PC Case') return 'case';
    if (s === 'Portable External HDDs') return 'external-storage';
    if (s === 'Power Inverters') return 'other';
    if (s === 'Projectors') return 'projector';
    if (s === 'Scanners') return 'printer';
    if (s === 'Software') return 'software';
    if (s === 'Solid State Drive for Notebook Desktop') return 'storage';
    if (s === 'Speakers') return 'speaker';
    if (s === 'Toner Cartridges') return 'printer';
    if (s === 'UPS AVR') return 'ups';
    if (s === 'WebCams') return 'camera';
    if (s === 'gaming chairs') return 'other';
    if (s === 'intel evo certified') return 'other';
    if (s === 'portable external ssds') return 'external-storage';
    // fall through
  }

  // ==================== GLOBAL PATTERNS ====================
  // CPU
  if (/\b(processor|cpu)\b/i.test(s) || /\bryzen\b/i.test(s) || /\bintel\s+core\b/i.test(s)) return 'cpu';

  // Motherboard
  if (/\bmotherboard\b/i.test(s) || /\bmobo\b/i.test(s)) return 'motherboard';

  // RAM / Memory
  if (/\b(memory|ram)\b/i.test(s) || /\bddr[345]\b/i.test(s) || /\bso-?dimm\b/i.test(s)) return 'ram';

  // GPU / Graphics
  if (/\b(video\s*card|graphic\s*card|gpu|vga)\b/i.test(s)) return 'gpu';

  // Storage (SSD/HDD)
  if (/\b(ssd|hdd|hard\s*drive|nvme|storage)\b/i.test(s)) return 'storage';

  // PSU
  if (/\bpsu\b/i.test(s) || /\bpower\s*supply\b/i.test(s) || /\bpower\s*unit\b/i.test(s)) return 'psu';

  // Case
  if (/\bcase\b/i.test(s) || /\bchassis\b/i.test(s) || /\bcasing\b/i.test(s)) return 'case';

  // CPU Cooler
  if (/\b(cooler|cooling|aircool|aio|heat\s*sink|water\s*cool)\b/i.test(s)) return 'cpu_cooler';
  if (/\bfan\b/i.test(s) && !s.includes('electric fan')) return 'cpu_cooler';

  // Monitor / Display
  if (/\b(monitor|display|lcd)\b/i.test(s)) return 'monitor';

  // Keyboard
  if (/\bkeyboard\b/i.test(s)) return 'keyboard';

  // Mouse
  if (/\bmouse\b/i.test(s) || /\bmice\b/i.test(s)) return 'mouse';

  // Headset/Headphones
  if (/\b(headset|headphone)\b/i.test(s) || /\bearphone\b/i.test(s)) return 'headset';

  // Speaker
  if (/\b(speaker|soundbar)\b/i.test(s)) return 'speaker';

  // Laptop
  if (/\blaptop\b/i.test(s) || /\bnotebook\b/i.test(s)) return 'laptop';

  // Network
  if (/\b(network|router|switch|hub|ethernet|wifi|wi-?fi|access point|repeater|range extender)\b/i.test(s)) return 'network';

  // Camera
  if (/\b(camera|webcam|cctv|security cam|ip cam|surveillance)\b/i.test(s)) return 'camera';

  // Cable/Adapter
  if (/\b(cable|adapter|hdmi|vga|usb|type-?c|dongle|converter|connector|plug|socket)\b/i.test(s)) return 'cable';

  // External Storage
  if (/\bexternal\b/i.test(s) && /\b(storage|ssd|hdd|drive)\b/i.test(s)) return 'external-storage';

  // Desktop systems
  if (/\b(desktop|all-in-one|aio)\b/i.test(s)) return 'desktop';

  // Microphone
  if (/\b(microphone|mic)\b/i.test(s)) return 'microphone';

  // Gamepad/Controller
  if (/\b(gamepad|controller|joystick)\b/i.test(s)) return 'gamepad';

  // Software
  if (/\bsoftware\b/i.test(s) || /\boperating system\b/i.test(s)) return 'software';

  // Tablet
  if (/\btablet\b/i.test(s)) return 'tablet';

  // UPS/AVR
  if (/\bups\b/i.test(s) || /\bavr\b/i.test(s)) return 'ups';

  // Powerbank
  if (/\bpower\s*bank\b/i.test(s)) return 'powerbank';

  // Memory Card
  if (/\bmemory\s*card\b/i.test(s) || /\bmicro\s*sd\b/i.test(s)) return 'memory-card';

  // Media Player
  if (/\b(media\s*player|streaming device)\b/i.test(s)) return 'media-player';

  // Chair
  if (/\bchair\b/i.test(s)) return 'chair';

  // Enclosure/Dock
  if (/\b(enclosure|caddy|dock)\b/i.test(s)) return 'enclosure';

  // General fan (lighting, case fans, etc.)
  if (/\bfan\b/i.test(s)) return 'fan';

  // Hub
  if (/\bhub\b/i.test(s)) return 'hub';

  // Powerbank variant
  if (/\bpower\s*station\b/i.test(s)) return 'powerbank';

  // Default
  return 'other';
}

// ── Read and process all JSON files ────────────────────────────────────────

function extractCategories(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf-8').trim();
    let items = [];
    if (content.startsWith('[')) {
      items = JSON.parse(content);
    } else {
      items = content.split('\n').filter(Boolean).map(l => JSON.parse(l));
    }
    const cats = new Set();
    for (const item of items) {
      if (item && item.category) cats.add(item.category.trim());
    }
    return cats;
  } catch (e) {
    console.error(`  Error reading ${path.basename(filepath)}: ${e.message}`);
    return new Set();
  }
}

function deriveStoreRules(storeName, rawCategories) {
  const rules = {};
  for (const raw of rawCategories) {
    const frontend = getFrontendCategory(raw, storeName);
    rules[raw] = frontend;
  }
  return rules;
}

function main() {
  console.log('🔍 Extracting raw categories from scraper output...\n');
  
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json')).sort();
  console.log(`Found ${files.length} JSON files\n`);
  
  const keyMap = {
    'benstore': 'Ben Store',
    'bermorzone': 'Bermor Techzone',
    'complink': 'Complink',
    'datablitz': 'DataBlitz',
    'dynaquest': 'DynaQuest PC',
    'easypc': 'EasyPC',
    'electroworld': 'Electroworld',
    'gigahertz': 'Gigahertz',
    'itech': 'iTech',
    'octagon': 'Octagon',
    'pcworx': 'PCWorx',
    'pcx': 'PC Express',
    'siliconvalley': 'Silicon Valley',
    'villman': 'VillMan'
  };

  const results = {};
  
  for (const file of files) {
    const filepath = path.join(INPUT_DIR, file);
    const storeName = file.replace('.json', '');
    const storeKey = keyMap[storeName.toLowerCase()] || storeName;
    
    const rawCats = extractCategories(filepath);
    console.log(`📦 ${storeKey}: ${rawCats.size} categories`);
    
    const storeRules = deriveStoreRules(storeKey, rawCats);
    results[storeKey] = storeRules;
    
    // Count unmapped
    const unmapped = Object.values(storeRules).filter(v => v === 'other').length;
    const total = Object.keys(storeRules).length;
    const mapped = total - unmapped;
    console.log(`   ✅ Mapped: ${mapped}/${total} (${Math.round(mapped/total*100)}%)`);
  }
  
  // Write output
  const outPath = path.join(INPUT_DIR, '..', 'generated_store_rules.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Full rules written to ${outPath}`);
  
  // Generate summary
  console.log('\n📊 CATEGORY DISTRIBUTION:');
  for (const [store, rules] of Object.entries(results)) {
    const counts = {};
    for (const v of Object.values(rules)) {
      counts[v] = (counts[v] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    console.log(`\n${store}:`);
    for (const [cat, cnt] of sorted) {
      const bar = '█'.repeat(Math.ceil(cnt / Math.max(1, Math.ceil(sorted[0][1]/10))));
      console.log(`  ${cat.padEnd(20)} ${cnt.toString().padStart(3)} ${bar}`);
    }
  }
  
  // Print as valid JS object for easy copy-paste
  console.log('\n📝 STORE_RULES JavaScript object:');
  console.log('const STORE_RULES = ' + JSON.stringify(results, null, 2) + ';');
}

main();
