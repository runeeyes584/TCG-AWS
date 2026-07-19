'use client'

import { useMemo } from 'react'
import {
  Particles,
  ParticlesProvider,
  useParticlesProvider,
} from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { Engine, ISourceOptions } from '@tsparticles/engine'

function ParticlesInner() {
  const { loaded } = useParticlesProvider()

  const options = useMemo<ISourceOptions>(
    () => ({
      fullScreen: { enable: false },
      fpsLimit: 60,
      detectRetina: true,
      background: { color: 'transparent' },
      particles: {
        number: { value: 60, density: { enable: true } },
        color: { value: ['#8b7fb0', '#5b5570', '#a78bd6', '#3d3a4d'] },
        opacity: {
          value: { min: 0.05, max: 0.35 },
          animation: { enable: true, speed: 0.4, sync: false },
        },
        size: { value: { min: 1, max: 4 } },
        move: {
          enable: true,
          direction: 'top',
          speed: { min: 0.2, max: 0.8 },
          random: true,
          straight: false,
          outModes: { default: 'out' },
        },
        shadow: { enable: true, color: '#a78bd6', blur: 6 },
      },
      emitters: {
        direction: 'top',
        rate: { quantity: 2, delay: 0.4 },
        size: { width: 100, height: 0 },
        position: { x: 50, y: 100 },
      },
    }),
    [],
  )

  if (!loaded) return null

  return (
    <Particles
      id="dungeon-particles"
      options={options}
      className="pointer-events-none absolute inset-0 z-0"
    />
  )
}

export function ParticlesBackground() {
  const init = useMemo(
    () => async (engine: Engine) => {
      await loadSlim(engine)
    },
    [],
  )

  return (
    <ParticlesProvider init={init}>
      <ParticlesInner />
    </ParticlesProvider>
  )
}
