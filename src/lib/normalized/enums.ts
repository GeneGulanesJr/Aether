export const CPU_SOCKETS = [
  'AM4', 'AM5', 'sTRX4',
  'LGA1151', 'LGA1200', 'LGA1700', 'LGA1851',
  'FP8',
] as const
export type CpuSocket = (typeof CPU_SOCKETS)[number]

export const MEMORY_TYPES = ['DDR4', 'DDR5'] as const
export type MemoryType = (typeof MEMORY_TYPES)[number]

export const MB_FORM_FACTORS = [
  'Mini-ITX', 'Micro-ATX', 'ATX', 'E-ATX',
] as const
export type MbFormFactor = (typeof MB_FORM_FACTORS)[number]

export type Chipset = string

export const GPU_POWER_CONNECTORS = ['6-pin', '8-pin', '12VHPWR'] as const
export type GpuPowerConnector = (typeof GPU_POWER_CONNECTORS)[number]

export const PSU_FORM_FACTORS = ['ATX', 'SFX', 'TFX'] as const
export type PsuFormFactor = (typeof PSU_FORM_FACTORS)[number]

export const COOLER_TYPES = ['air', 'aio', 'passive'] as const
export type CoolerType = (typeof COOLER_TYPES)[number]

export const STORAGE_INTERFACES = ['SATA', 'M.2'] as const
export type StorageInterface = (typeof STORAGE_INTERFACES)[number]

export const STORAGE_PROTOCOLS = ['SATA', 'NVMe'] as const
export type StorageProtocol = (typeof STORAGE_PROTOCOLS)[number]

export const CASE_FORM_FACTORS = ['Mini-ITX', 'Micro-ATX', 'ATX', 'E-ATX'] as const
export type CaseFormFactor = (typeof CASE_FORM_FACTORS)[number]
