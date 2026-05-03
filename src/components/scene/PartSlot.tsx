/**
 * PartSlot — Represents a single component slot in the 3D scene.
 * Animates between ghosted (empty) and solid (filled) states.
 *
 * eslint-disable react-hooks/refs — R3F components read refs during render to pass
 * mutable values to Three.js materials, which is the standard pattern.
 */

/* eslint-disable react-hooks/refs */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PartSlotProps {
  position: [number, number, number]
  color: string
  filled: boolean
  scale?: [number, number, number]
}

const GHOST_OPACITY = 0.12
const SOLID_OPACITY = 0.92

export function PartSlot({ position, color, filled, scale = [1, 1, 1] }: PartSlotProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const currentOpacity = useRef(filled ? SOLID_OPACITY : GHOST_OPACITY)
  const targetOpacity = filled ? SOLID_OPACITY : GHOST_OPACITY

  useFrame((_, delta) => {
    // Smoothly interpolate opacity toward target
    const speed = 5
    currentOpacity.current += (targetOpacity - currentOpacity.current) * speed * delta
    // Scale animation — slight grow when filled
    const s = filled ? 1.0 : 0.92
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