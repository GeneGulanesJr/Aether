/**
 * PartSlot — Represents a single component slot in the 3D scene.
 * Animates between ghosted (empty) and solid (filled) states.
 */

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneSlot } from './useSceneBuild'

interface PartSlotProps {
  slot: SceneSlot
  color: string
  position: [number, number, number]
  scale?: [number, number, number]
}

export function PartSlot({ slot, color, position, scale = [1, 1, 1] }: PartSlotProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const targetOpacity = slot.filled ? 1.0 : 0.15
  const currentOpacity = useRef(slot.filled ? 1.0 : 0.15)
  const targetScale = slot.filled ? 1.0 : 0.8
  const currentScale = useRef(slot.filled ? 1.0 : 0.8)

  useFrame((_, delta) => {
    if (!meshRef.current) return

    // Lerp opacity
    const opSpeed = 3 * delta
    currentOpacity.current += (targetOpacity - currentOpacity.current) * opSpeed
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.opacity = currentOpacity.current

    // Lerp scale
    const scSpeed = 4 * delta
    currentScale.current += (targetScale - currentScale.current) * scSpeed
    const s = currentScale.current
    meshRef.current.scale.set(scale[0] * s, scale[1] * s, scale[2] * s)
  })

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={currentOpacity.current}
        roughness={0.6}
        metalness={0.3}
      />
    </mesh>
  )
}
