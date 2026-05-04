/**
 * BuildScene — R3F canvas with procedural PC case and dynamic parts.
 * 
 * Performance:
 * - frameloop="demand" — only re-renders on state change
 * - Pixel ratio capped at 1.5
 * - Falls back gracefully when WebGL is unavailable
 */

import { useRef, useEffect, Component, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment } from '@react-three/drei'
import * as THREE from 'three'
import type { UseBuildResult } from '../../hooks/useBuild'
import { PcCase } from './PcCase'
import { PartSlot } from './PartSlot'
import { useSceneBuild } from './useSceneBuild'

// Slot positions inside the case — where each component goes
const SLOT_POSITIONS: Record<string, { position: [number, number, number]; scale: [number, number, number] }> = {
  cpu:            { position: [-0.5, 0.8, -0.5],  scale: [0.5, 0.08, 0.5] },
  motherboard:    { position: [-0.3, 0.2, -0.75], scale: [2.0, 2.5, 0.06] },
  ram:            { position: [0.8, 0.6, -0.5],   scale: [0.15, 0.8, 0.35] },
  gpu:            { position: [0.0, -0.5, 0.0],   scale: [2.0, 0.3, 0.8] },
  storage:        { position: [-0.5, -1.2, 0.3],  scale: [0.6, 0.15, 0.4] },
  psu:            { position: [0.5, -1.4, 0.3],   scale: [0.8, 0.5, 0.7] },
  case:           { position: [0, 0, 0],           scale: [3, 3.5, 2] },
  cpu_cooler:     { position: [-0.5, 1.1, -0.5],  scale: [0.6, 0.3, 0.6] },
  fans:           { position: [0, 1.2, -0.9],     scale: [0.5, 0.5, 0.1] },
  monitor:        { position: [0, 2.0, 0],        scale: [1.8, 1.0, 0.05] },
}

interface BuildSceneProps {
  build: UseBuildResult
}

function SceneContent({ build }: BuildSceneProps) {
  const { sceneSlots, categoryColors } = useSceneBuild(build)
  const groupRef = useRef<THREE.Group>(null)
  const { invalidate } = useThree()

  // Gentle idle float
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.1
    }
  })

  // Invalidate on build changes to trigger re-render
  const prevFilledCount = useRef(build.selectedCount)
  useEffect(() => {
    if (build.selectedCount !== prevFilledCount.current) {
      prevFilledCount.current = build.selectedCount
      invalidate()
    }
  }, [build.selectedCount, invalidate])

  return (
    <group ref={groupRef}>
      <PcCase />

      {sceneSlots.map((slot) => {
        const pos = SLOT_POSITIONS[slot.category]
        if (!pos) return null
        const color = categoryColors[slot.category] ?? '#6b7280'

        return (
          <PartSlot
            key={slot.category}
            color={color}
            filled={slot.filled}
            position={pos.position}
            scale={pos.scale}
          />
        )
      })}

      <ContactShadows
        position={[0, -1.8, 0]}
        opacity={0.3}
        scale={8}
        blur={2}
        far={4}
      />
    </group>
  )
}

// Error boundary specifically for WebGL failures
class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn('[BuildScene] WebGL not available, falling back:', error.message)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// Check if WebGL is available before even trying
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    )
  } catch {
    return false
  }
}

export function BuildScene({ build }: BuildSceneProps) {
  // Pre-check WebGL availability — skip entirely if not supported
  if (!hasWebGL()) {
    return null
  }

  return (
    <WebGLErrorBoundary fallback={null}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [4, 3, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <directionalLight position={[-3, 2, -3]} intensity={0.2} />

        <Environment preset="night" />

        <SceneContent build={build} />
      </Canvas>
    </WebGLErrorBoundary>
  )
}
