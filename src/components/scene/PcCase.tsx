/**
 * PcCase — Procedural PC case model built from basic Three.js geometries.
 * No GLTF files needed — pure geometry (boxes, planes).
 */

export function PcCase() {
  return (
    <group>
      {/* Case shell */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 3.5, 2]} />
        <meshStandardMaterial
          color="#1a1a2e"
          transparent
          opacity={0.4}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Glass side panel */}
      <mesh position={[0, 0, 1.01]}>
        <boxGeometry args={[2.9, 3.4, 0.02]} />
        <meshStandardMaterial
          color="#2a2a4a"
          transparent
          opacity={0.15}
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>

      {/* Motherboard tray */}
      <mesh position={[-0.3, 0.2, -0.8]}>
        <boxGeometry args={[2.2, 2.8, 0.05]} />
        <meshStandardMaterial
          color="#0a3a0a"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Front panel (with vents) */}
      <mesh position={[0, 0, -1.01]}>
        <boxGeometry args={[2.9, 3.4, 0.02]} />
        <meshStandardMaterial
          color="#111122"
          transparent
          opacity={0.6}
          roughness={0.7}
        />
      </mesh>

      {/* Power button LED */}
      <mesh position={[0, 1.5, -1.02]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
}
