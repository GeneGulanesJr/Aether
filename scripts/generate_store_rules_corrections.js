#!/usr/bin/env node
/**
 * Manual corrections to generated_store_rules.json
 * Fixes edge-case mappings from automated generation
 */

import fs from 'fs';
import path from 'path';

const jsonPath = path.join(
  process.cwd(),
  'scrapper',
  'generated_store_rules.json'
);

let rules = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// ── PCWorx fixes ──────────────────────────────────────────────────────────
if (rules['PCWorx']) {
  const pc = rules['PCWorx'];
  // CPU Cooler → cpu_cooler
  if (pc['CPU Cooler']) pc['CPU Cooler'] = 'cpu_cooler';
  // Apple Macbook → laptop
  if (pc['Apple Macbook']) pc['Apple Macbook'] = 'laptop';
  // iPhone/model phone → tablet (phones category not in frontend)
  if (pc['Iphone']) pc['Iphone'] = 'tablet';
  // Bad GamePad mapping
  if (pc['Gamepad']) pc['Gamepad'] = 'gamepad';
  // controller → gamepad
  if (pc['controller']) pc['controller'] = 'gamepad';
  // USB → cable (branded USB drives should be cable per context)
  if (pc['USB']) pc['USB'] = 'storage';  // USB flash drives = storage
  // Memory Card / Micro SD / MICRO SD → memory-card (these are memory_cards not Storage)
  if (pc['Memory Card']) pc['Memory Card'] = 'memory-card';
  if (pc['Micro SD']) pc['Micro SD'] = 'memory-card';
  if (pc['MICRO SD']) pc['MICRO SD'] = 'memory-card';
  // MIC → microphone
  if (pc['MIC']) pc['MIC'] = 'microphone';
  // Laptop Cooler – it's a laptop accessory, keep as laptop per script policy
  if (pc['Laptop Cooler']) pc['Laptop Cooler'] = 'laptop';
  // Mini PC → other (not in frontend categories)
  if (pc['MINI PC']) pc['MINI PC'] = 'desktop';
  // New MacBook entry
  if (pc['New  Macbook']) pc['New  Macbook'] = 'laptop';
  // Game Console → other
  if (pc['Game Console']) pc['Game Console'] = 'other';
  // Router / WIFI Router / ROUTER → network
  if (!pc['WIFI Router']) pc['WIFI Router'] = 'network';
  if (!pc['ROUTER']) pc['ROUTER'] = 'network';
  // Hard Disk → storage
  if (pc['Hard Disk']) pc['Hard Disk'] = 'storage';
  // HDD Bundle / hdd → storage
  if (pc['HDD BUNDLE']) pc['HDD BUNDLE'] = 'storage';
  if (pc['hdd']) pc['hdd'] = 'storage';
  // Memory / RAM variants → memory-card or ram
  if (pc['MEMORY STORAGE']) pc['MEMORY STORAGE'] = 'ram';
  if (pc['Memory Storage']) pc['Memory Storage'] = 'ram';
  if (pc['MEMORY DIMM']) pc['MEMORY DIMM'] = 'ram';
  if (pc['Internal Memory Storage']) pc['Internal Memory Storage'] = 'ram';
  // SSD variants
  if (pc['Internal SSD']) pc['Internal SSD'] = 'storage';
  if (pc['ssd']) pc['ssd'] = 'storage';
  if (pc['SSD']) pc['SSD'] = 'storage';
  if (pc['Portable SSD']) pc['Portable SSD'] = 'storage';
  if (pc['SDD']) pc['SDD'] = 'storage';
  // GPU → gpu (already there, keep)
  // Intel → other (processor maker)
  if (pc['Intel']) pc['Intel'] = 'other';
  // Schematic / Picture → other
  if (pc['Schematic']) pc['Schematic'] = 'other';
  if (pc['Picture']) pc['Picture'] = 'other';
  // Headset / Headphones
  if (pc['MIC']) pc['MIC'] = 'microphone';
  if (pc['Headphone']) pc['Headphone'] = 'headset';
  // Accessories
  if (pc['Accessories']) pc['Accessories'] = 'other';
  // Styles & Brands
  if (pc['CISCO']) pc['CISCO'] = 'network';
  if (pc['TPLINK']) pc['TPLINK'] = 'network';
  if (pc['Toucha']) pc['Toucha'] = 'other';
  if (pc['BOSTON']) pc['BOSTON'] = 'other';
  if (!pc['FEATHER & FRIENDS']) pc['FEATHER & FRIENDS'] = 'other';
  if (!pc['Iron Man']) pc['Iron Man'] = 'other';
  if (!pc['MSI']) pc['MSI'] = 'other';
  if (!pc['HP']) pc['HP'] = 'other';
  if (!pc['Acer']) pc['Acer'] = 'other';
  if (!pc['Lenovo']) pc['Lenovo'] = 'other';
  if (!pc['Asus']) pc['Asus'] = 'other';
  if (!pc['Gigabyte']) pc['Gigabyte'] = 'other';
  if (!pc['Kingston']) pc['Kingston'] = 'other';
  if (!pc['HIKVISION']) pc['HIKVISION'] = 'other';
  if (!pc['Seagate']) pc['Seagate'] = 'other';
  if (!pc['WD']) pc['WD'] = 'other';
  if (!pc['Crucial']) pc['Crucial'] = 'other';
  if (!pc['ADATA']) pc['ADATA'] = 'other';
  if (!pc['FSP']) pc['FSP'] = 'other';
  if (!pc['GAMDIAS']) pc['GAMDIAS'] = 'other';
  if (!pc['Fantech']) pc['Fantech'] = 'other';
  if (!pc['Rapoo']) pc['Rapoo'] = 'other';
  if (!pc['Redragon']) pc['Redragon'] = 'other';
  if (!pc['A4tech']) pc['A4tech'] = 'other';
  if (!pc['Logitech']) pc['Logitech'] = 'other';
  if (!pc['Steelseries']) pc['Steelseries'] = 'other';
  if (!pc['Razer']) pc['Razer'] = 'other';
  if (!pc['CORSAIR']) pc['CORSAIR'] = 'other';
  if (!pc['Ducky']) pc['Ducky'] = 'other';
  // PCWorx CLOUD → blur
  if (!pc['CLOUD']) pc['CLOUD'] = 'other';
}

// ── DataBlitz fixes ───────────────────────────────────────────────────────
if (rules['DataBlitz']) {
  const db = rules['DataBlitz'];
  // Memory Card (branded product) → storage not ram
  if (db['Memory Card']) db['Memory Card'] = 'storage';
  // Tablet → tablet
  if (db['Tablet']) db['Tablet'] = 'tablet';
  // Headphones & Earbuds → headset  
  if (db['Earphones & Earbuds']) db['Earphones & Earbuds'] = 'headset';
  // Cooling Fans/Systems → cpu_cooler (it's a cooler category)
  if (db['Cooling Fans/ Systems']) db['Cooling Fans/ Systems'] = 'cpu_cooler';
  // Mini PC → desktop not other
  if (db['Mini PC']) db['Mini PC'] = 'desktop';
  // Speakers → speaker (already mapped)
  // Electronics → other (already)
  // Earphone / Headphone accessories
  if (db['Headphone Cushions & Tips']) db['Headphone Cushions & Tips'] = 'headset';
  if (!db['Earphone Cushions & Tips']) db['Earphone Cushions & Tips'] = 'headset';
}

// ── Electroworld fixes ─────────────────────────────────────────────────────
if (rules['Electroworld']) {
  const ew = rules['Electroworld'];
  // Monitors → monitor
  // Laptops → laptop
  // These are already caught by keyword rules but brand-heavy categories:
  // Input Device → keyboard (already mapped)
  // Output Device → headset (already mapped)
  // Keep as-is; already quite comprehensive
}

// ── Bermor Techzone fixes ──────────────────────────────────────────────────
if (rules['Bermor Techzone']) {
  const bz = rules['Bermor Techzone'];
  // Tablet mount/furniture categories that map to "table" → "table"
  // But Tablet itself → "table"
  // Some are misspelled as "table" already; keep as other for furniture
  if (bz['Table']) bz['Table'] = 'table';
  if (bz['table']) bz['table'] = 'other'; // context may be furniture
  // WiFi → network (not cable)
  // Wifi? check if exists
}

// ── VillMan fixes ──────────────────────────────────────────────────────────
if (rules['VillMan']) {
  const vm = rules['VillMan'];
  // IP Cameras → camera (not other)
  if (vm['IP Cameras']) vm['IP Cameras'] = 'camera';
  // HDDs Desktop PCs – this should be "desktop" not "storage"
  // Actually the raw category is "HDDs Desktop PCs" suggesting HDDs for desktop PCs
  if (vm['HDDs Desktop PCs']) vm['HDDs Desktop PCs'] = 'storage';
  // Mesh & accessories
  if (vm['Wifi Mesh Kit']) vm['Wifi Mesh Kit'] = 'network';
  // Desktop要进一步映射
  if (vm['tower desktop']) vm['tower desktop'] = 'desktop';
  if (vm['all in one pcs']) vm['all in one pcs'] = 'desktop';
  // Headsets already mapped
  // Laptop accessories
  if (vm['Tablet & Mobile Mounts']) vm['Tablet & Mobile Mounts'] = 'other';
  // Professional camera> camera
  if (vm['Professional cameras']) vm['Professional cameras'] = 'camera';
}

// ── Gigahertz fixes ────────────────────────────────────────────────────────
if (rules['Gigahertz']) {
  const gh = rules['Gigahertz'];
  // Electric Fan → other
  if (gh['Electric Fan']) gh['Electric Fan'] = 'other';
  // Laptop Speaker → other (part of laptop)
  if (gh['Laptop Speaker']) gh['Laptop Speaker'] = 'other';
  // Recycle charger cradle → other
  if (gh['Recycle Charger Cradle']) gh['Recycle Charger Cradle'] = 'other';
  // Mousepad variant → other
  if (gh['Mousepad']) gh['Mousepad'] = 'other';
  // Working From Home Essentials → other
  if (gh['Working From Home']) gh['Working From Home'] = 'other';
}

// ── Octagon fixes ──────────────────────────────────────────────────────────
if (rules['Octagon']) {
  const og = rules['Octagon'];
  // ADAPTER and AVR and UPS → other (policy per existing script)
  if (og['ADAPTER']) og['ADAPTER'] = 'other';
  if (og['AVR and UPS']) og['AVR and UPS'] = 'other';
  // Head Phone → headset
  if (og['Head Phone']) og['Head Phone'] = 'headset';
  // Printers → printer
  if (og['Printer, Copier']) og['Printer, Copier'] = 'printer';
  // ACER ALL-IN-ONE → desktop not laptop
  if (og['ACER ALL-IN-ONE COMPUTER']) og['ACER ALL-IN-ONE COMPUTER'] = 'desktop';
  // Fan map → cpu_cooler already
  // Computer Processors → cpu_cooler? No correct is cpu
  if (og['Computer Processors']) og['Computer Processors'] = 'cpu';
  // Hard Drives → storage
  if (og['Hard Drives']) og['Hard Drives'] = 'storage';
  // Headset and Gamepad already mapped
}

// ── DynaQuest fixes ───────────────────────────────────────────────────────
if (rules['DynaQuest PC']) {
  const dq = rules['DynaQuest PC'];
  // Memory Devices → ram
  if (dq['Memory Devices']) dq['Memory Devices'] = 'ram';
  // Mini-PC → other
  // Mobile → other
  // Lightings → other
  // Well if exists "Wellness" → other
  // Gaming Combo → other
  // LAN Card → other
  // Well if "WELLNESS" → other
  // USB Hub / Card Reader → hub (already)
}

// ── iTech fixes ────────────────────────────────────────────────────────────
if (rules['iTech']) {
  const it = rules['iTech'];
  // Desktops → other (not in frontend categories per specification)
  // Headphones → other
  // Asus/HP/Acer laptops already mapped correctly
  if (it['Desktops']) it['Desktops'] = 'other';
  if (it['Asus']) it['Asus'] = 'other';
  if (it['Fantech']) it['Fantech'] = 'other';
  if (it['Lenovo Pc Components']) it['Lenovo Pc Components'] = 'cpu';
  // Soundserver pixel
  if (it['Hyperx Peripherals']) it['Hyperx Peripherals'] = 'other';
  // Laptop accessories → other
  if (it['Laptop Accessories']) it['Laptop Accessories'] = 'other';
  // Rog Ally → other
  if (it['Rog Ally']) it['Rog Ally'] = 'other';
  // Ipad → other
  if (it['Ipad']) it['Ipad'] = 'other';
  if (it['Nintendo Switch']) it['Nintendo Switch'] = 'other';
  if (it['Rog Phone Mobile Phones']) it['Rog Phone Mobile Phones'] = 'other';
  if (it['Mobile Phones']) it['Mobile Phones'] = 'other';
  if (!it['Office Peripherals']) it['Office Peripherals'] = 'other';
  if (!it['Peripherals']) it['Peripherals'] = 'other';
  if (!it['Others']) it['Others'] = 'other';
  //iPad not in frontend
  //Keyboards already good
}

// ── Ben Store fixes ─────────────────────────────────────────────────────────
if (rules['Ben Store']) {
  const bs = rules['Ben Store'];
  // Laptop Coolers → other (laptop accessories, not cpu_cooler)
  if (bs['Laptop Coolers']) bs['Laptop Coolers'] = 'other';
  // Egpu Enclosures → gpu
  if (bs['Egpu Enclosures']) bs['Egpu Enclosures'] = 'gpu';
  // Acer, HP, Dell brands → other
  // Already done via script
}

fs.writeFileSync(jsonPath, JSON.stringify(rules, null, 2));
console.log('✅ Manual corrections applied');
