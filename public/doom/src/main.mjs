// ===== main.mjs ===================================================================
// Main entry point for the game, initialization and core rendering loop
// Ben Coleman, 2022
// Modified: Added FPS throttle, render scale & quality tiers for PC Builder integration
// ==================================================================================

import { fetchShaders, hideOverlay, setOverlay } from './utils.mjs'
import { buildWorld, buildTemplates } from './world.mjs'
import { initInput, handleInputs, updatePlayerCamera } from './controls.mjs'
import { loadDataFiles, buildTextureCache } from './data.mjs'

import * as Cannon from '../lib/cannon-es/dist/cannon-es.js'
import * as twgl from '../lib/twgl/dist/4.x/twgl-full.module.js'
import { mat4, vec3 } from '../lib/gl-matrix/esm/index.js'
import { getGPUTier } from '../lib/detect-gpu/detect-gpu.esm.js'

const VERSION = '0.5.5-pcbuilder'
const FAR_CLIP = 140
const MAX_LIGHTS = 16 // Should match shader code
const MAP_FILE = 'levels/demo.json5'

// ── PC Builder: Performance params from URL ──
// Usage: doom.html?fps=30&scale=0.5&drawdist=12&label=Playable&tier=2
// Defaults to full performance if no params given
const urlParams = new URLSearchParams(window.location.search)
const TARGET_FPS = parseInt(urlParams.get('fps')) || 0
const RENDER_SCALE = parseFloat(urlParams.get('scale')) || 1
const DRAW_DIST = parseInt(urlParams.get('drawdist')) || 0
const PERF_LABEL = urlParams.get('label') || ''
const QUALITY_TIER = parseInt(urlParams.get('tier')) ?? 4  // 0=lowest, 4=ultra

// Effective draw distance: use param if set, otherwise full
const effectiveFarClip = DRAW_DIST > 0 ? DRAW_DIST : FAR_CLIP

// ── Quality tier settings ──
// Each tier adjusts: lighting complexity, specular, ambient, texture filtering, fog
const QUALITY_SETTINGS = {
  0: { maxLights: 1,  specular: 0,   ambient: [0.6, 0.55, 0.5, 1],  fogEnabled: true, fogDensity: 0.08, smoothTextures: false, name: 'LOWEST' },
  1: { maxLights: 3,  specular: 0,   ambient: [0.5, 0.48, 0.45, 1], fogEnabled: true, fogDensity: 0.04, smoothTextures: false, name: 'LOW' },
  2: { maxLights: 6,  specular: 0.1, ambient: [0.4, 0.38, 0.35, 1], fogEnabled: true, fogDensity: 0.02, smoothTextures: true,  name: 'MEDIUM' },
  3: { maxLights: 10, specular: 0.2, ambient: [0.35, 0.33, 0.3, 1], fogEnabled: false, fogDensity: 0,    smoothTextures: true,  name: 'HIGH' },
  4: { maxLights: 16, specular: 0.3, ambient: [0.3, 0.3, 0.3, 1],   fogEnabled: false, fogDensity: 0,    smoothTextures: true,  name: 'ULTRA' },
}
const quality = QUALITY_SETTINGS[Math.min(Math.max(QUALITY_TIER, 0), 4)]

let totalTime = 0
let frameCount = 0
let lastFpsUpdate = 0
let measuredFps = 0

const player = {
  yAngle: 0,
  xAngle: -0.1,
  body: null,
  height: 6,
  sector: 0,
  noClip: false,
  fov: 38,
}

const baseUniforms = {
  u_lightAmbient: quality.ambient,
  u_specular: [1, 1, 1, 1],
  u_shininess: 350,
  u_specularFactor: quality.specular,
}

// ── FPS Throttle Logic ──
let lastFrameTime = 0
const frameInterval = TARGET_FPS > 0 ? 1000 / TARGET_FPS : 0

//
// ENTRYPOINT!
//
window.onload = async () => {
  console.log(`🌍 Starting up... \n⚓ v${VERSION}`)
  console.log(`🎮 PC Builder perf — FPS:${TARGET_FPS || 'unlimited'} Scale:${RENDER_SCALE} DrawDist:${effectiveFarClip} Tier:${quality.name} Label:"${PERF_LABEL}"`)
  document.querySelector('#version').innerText = VERSION

  const canvas = document.querySelector('canvas')
  const gl = canvas.getContext('webgl2')
  if (!gl) {
    setOverlay('Unable to initialize WebGL. Your browser or machine may not support it!')
    return
  }

  // ── Show performance label if provided ──
  if (PERF_LABEL) {
    const perfEl = document.getElementById('perf-label')
    if (perfEl) {
      perfEl.textContent = PERF_LABEL
      perfEl.classList.add('visible')
      if (QUALITY_TIER !== null) perfEl.classList.add('tier-' + Math.min(Math.max(QUALITY_TIER, 0), 4))
    }
  }

  // ── Apply render scale ──
  if (RENDER_SCALE < 1) {
    const setRenderSize = () => {
      const width = Math.round(canvas.clientWidth * RENDER_SCALE)
      const height = Math.round(canvas.clientHeight * RENDER_SCALE)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }
    setRenderSize()
    window.addEventListener('resize', setRenderSize)
  }

  // Only show GPU warning if not in PC Builder mode
  if (!urlParams.has('fps')) {
    const gpu = await getGPUTier()
    console.log(`🎮 GPU - Tier:${gpu.tier}, FPS:${gpu.fps}, Make:${gpu.gpu}, Mobile:${gpu.isMobile}`)
  }

  // Load data files
  let map, thingDB
  try {
    console.log(`💾 Loading map '${MAP_FILE}' and data files...`)
    ;({ map, thingDB } = await loadDataFiles(MAP_FILE))
    console.log(`🗺️ Map '${map.name}' loaded`)
  } catch (e) {
    setOverlay(`Data loading error: ${e.message}`)
    return
  }

  initInput(gl)

  let worldProg, spriteProg
  try {
    const { vertex: worldVert, fragment: worldFrag } = await fetchShaders('shaders/world-vert.glsl', 'shaders/world-frag.glsl')

    // ── Patch shaders for quality tier ──
    // If fog is enabled, inject fog uniform and fog calculation into the shaders
    let worldFragPatched = worldFrag
    if (quality.fogEnabled) {
      // Replace the final gl_FragColor assignment with a fog-blended version
      // Distance fog: fades to black at draw distance, hiding pop-in
      const fogInsert = `
  float fogDist = length(v_position.xyz - u_viewInverse[3].xyz);
  float fogFactor = clamp(exp(-fogDensity * fogDist * fogDist), 0.0, 1.0);
  vec3 fogColor = vec3(0.0, 0.0, 0.0); // Black fog
  if (u_debugColor.a > 0.0) {
    gl_FragColor = u_debugColor;
  } else {
    gl_FragColor = vec4(mix(fogColor, outColor.rgb, fogFactor), outColor.a);
  }`
      // Replace the original debug/final color block
      worldFragPatched = worldFrag.replace(
        /if \(u_debugColor\.a > 0\.0\)[\s\S]*?gl_FragColor = outColor;/,
        fogInsert
      )
    }

    // ── Patch world vert shader to pass view position for fog ──
    let worldVertPatched = worldVert
    if (quality.fogEnabled) {
      // v_position is already in world space, that's enough for fog distance
    }

    worldProg = twgl.createProgramInfo(gl, [worldVert, worldFrag || worldVert, worldFragPatched])

    const { vertex: spriteVert, fragment: spriteFrag } = await fetchShaders('shaders/sprite-vert.glsl', 'shaders/sprite-frag.glsl')

    let spriteFragPatched = spriteFrag
    if (quality.fogEnabled) {
      const spriteFogInsert = `
  float fogDist = length(v_position.xyz - u_lights[0].pos);
  float fogFactor = clamp(exp(-u_fogDensity * fogDist * fogDist), 0.0, 1.0);
  vec3 fogColor = vec3(0.0, 0.0, 0.0);
  gl_FragColor = vec4(mix(fogColor, outColor.rgb, fogFactor), 1.0);`
      spriteFragPatched = spriteFrag.replace(
        /gl_FragColor = outColor;/,
        spriteFogInsert
      )
    }

    spriteProg = twgl.createProgramInfo(gl, [spriteVert, spriteFragPatched])

    // ── Compile shaders with modified MAX_LIGHTS for lower tiers ──
    // We can't change the const in GLSL easily, so we just send 0-intensity lights
    // for slots beyond our quality.maxLights. The shader skips those automatically.

    console.log(`🎨 Loaded shaders (quality: ${quality.name}, maxLights: ${quality.maxLights}, specular: ${quality.specular}, fog: ${quality.fogEnabled})`)
  } catch (err) {
    console.error(err)
    setOverlay(err.message)
    return
  }

  // Load textures — pass quality setting for texture filtering
  let textureCache
  try {
    textureCache = await buildTextureCache(gl, map, thingDB, quality.smoothTextures)
    console.log(`🖼️ Loaded ${Object.keys(textureCache).length} textures (filtering: ${quality.smoothTextures ? 'LINEAR' : 'NEAREST'})`)
  } catch (err) {
    console.error(err)
    setOverlay(`Texture loading error ${err}`)
  }

  let templates
  try {
    templates = await buildTemplates(gl, textureCache, thingDB)
    console.log(`🗿 Loaded ${Object.keys(templates).length} thing templates`)
  } catch (err) {
    console.error(err)
    setOverlay(`Loading thing templates failed ${err.message}`)
    return
  }

  setTimeout(() => {
    hideOverlay()
  }, 5000)

  const physWorld = new Cannon.World({ gravity: new Cannon.Vec3(0, 0, 0) })
  player.body = new Cannon.Body({
    mass: 0.001,
    shape: new Cannon.Sphere(1.5),
    linearDamping: 0.995,
  })
  physWorld.addBody(player.body)
  console.log('🧪 Physics initialized')

  const { worldObjs, thingInstances, playerStart } = await buildWorld(map, gl, templates, textureCache)
  console.log(`🧩 Map '${map.name}' — ${worldObjs.length} parts, ${thingInstances.length} things`)

  player.body.position.x = playerStart.x
  player.body.position.y = player.height
  player.body.position.z = playerStart.y
  player.yAngle = playerStart.angle

  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)

  console.log(`♻️ Starting render loop (target FPS: ${TARGET_FPS || 'unlimited'}, quality: ${quality.name})`)
  let prevTime = 0

  document.getElementById('loading').remove()

  //
  // Main render loop
  //
  function render(now) {
    requestAnimationFrame(render)

    // ── FPS throttle: skip frames if we're running faster than target ──
    if (TARGET_FPS > 0) {
      const elapsed = now - lastFrameTime
      if (elapsed < frameInterval) {
        return
      }
      lastFrameTime = now - (elapsed % frameInterval)
    }

    now *= 0.001
    const deltaTime = now - prevTime
    prevTime = now
    totalTime += deltaTime

    // ── Measure actual FPS ──
    frameCount++
    if (now - lastFpsUpdate >= 1.0) {
      measuredFps = frameCount
      frameCount = 0
      lastFpsUpdate = now
    }

    // Process inputs and controls
    const camera = mat4.targetTo(mat4.create(), [0, 0, 0], [0, 0, -1], [0, 1, 0])
    updatePlayerCamera(map, player, camera)
    handleInputs(deltaTime, player, camera)

    physWorld.fixedStep()

    gl.clear(gl.COLOR_BUFFER_BIT)

    // ── Render scale viewport ──
    if (RENDER_SCALE < 1) {
      gl.viewport(0, 0, canvas.width, canvas.height)
    } else {
      twgl.resizeCanvasToDisplaySize(gl.canvas)
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    }

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
    const perspective = mat4.perspective(mat4.create(), (player.fov * Math.PI) / 180, aspect, 0.1, effectiveFarClip)
    const view = mat4.invert(mat4.create(), camera)
    const viewPerspective = mat4.multiply(mat4.create(), perspective, view)

    // Player position and light
    const playerPos = [player.body.position.x, player.body.position.y, player.body.position.z]
    const playerLight = {
      pos: playerPos,
      color: [1, 1, 1, 1],
      intensity: 1.1,
      radius: effectiveFarClip,
    }

    // Collect thing lights, limited by quality tier
    const thingLights = []
    for (const instance of thingInstances) {
      if (instance.template.light) {
        const lightTmpl = instance.template.light
        const lightPos = [instance.location[0], instance.location[1] + lightTmpl.height, instance.location[2]]
        const dist = vec3.distance(lightPos, playerPos)
        if (dist < effectiveFarClip) {
          thingLights.push({ dist, lightPos, lightTmpl })
        }
      }
    }
    thingLights.sort((a, b) => a.dist - b.dist)

    const uniforms = {
      u_viewInverse: camera,
      'u_lights[0]': playerLight,
      ...baseUniforms,
    }

    // ── Quality: limit dynamic lights based on tier ──
    let lightCount = 1
    const maxLights = quality.maxLights
    for (const { lightPos, lightTmpl } of thingLights) {
      if (lightCount >= maxLights) break
      uniforms[`u_lights[${lightCount++}]`] = {
        pos: lightPos,
        color: lightTmpl.color,
        intensity: lightTmpl.intensity,
        radius: lightTmpl.radius,
      }
    }

    // ── Quality: fog uniform for low tiers ──
    if (quality.fogEnabled) {
      uniforms.u_fogDensity = quality.fogDensity
    }

    // ── Performance HUD ──
    if (totalTime > 2) {
      const fpsDisplay = TARGET_FPS > 0
        ? `FPS: ${measuredFps}/${TARGET_FPS}`
        : `FPS: ${measuredFps}`
      const qualDisplay = ` | Quality: ${quality.name}`
      const labelDisplay = PERF_LABEL ? ` | ${PERF_LABEL}` : ''
      setOverlay(`${fpsDisplay}${qualDisplay}${labelDisplay}`)
    }

    drawWorld(gl, worldProg, uniforms, worldObjs, viewPerspective, physWorld, map)
    drawThings(gl, spriteProg, uniforms, thingInstances, view, perspective, deltaTime)
  }

  requestAnimationFrame(render)
}

//
// Draw the world geometry
//
function drawWorld(gl, programInfo, uniforms, worldObjs, viewPerspective, physWorld, map) {
  for (const obj of worldObjs) {
    if (obj.body) {
      physWorld.removeBody(obj.body)
    }

    if (obj.type == 'line' && obj.body) {
      const line = map.lines[obj.id]
      const frontSecId = line.front.sector
      const backSecId = line.back.sector

      if (frontSecId == player.sector || backSecId == player.sector) {
        physWorld.addBody(obj.body)
      }
    }

    const drawUniforms = {
      ...uniforms,
      u_debugColor: [0, 0, 0, 0],
      u_yOffset: 0,
      u_xOffset: 0,
      u_brightness: 1.0,
      ...obj.uniforms,
      u_texture: obj.texture,
      u_worldInverseTranspose: mat4.create(),
      u_world: mat4.create(),
      u_worldViewProjection: viewPerspective,
    }

    gl.useProgram(programInfo.program)
    twgl.setBuffersAndAttributes(gl, programInfo, obj.bufferInfo)
    twgl.setUniforms(programInfo, drawUniforms)
    twgl.drawBufferInfo(gl, obj.bufferInfo, gl.TRIANGLES)
  }
}

//
// Draw all the things (billboard sprites)
//
function drawThings(gl, programInfo, uniforms, thingInstances, view, perspective, deltaTime) {
  for (const instance of thingInstances) {
    let thingTexture = instance.template.textures[instance.textureIndex]
    instance.animTime += deltaTime
    if (instance.animTime > instance.template.animSpeed) {
      instance.animTime = 0.0
      instance.textureIndex = (instance.textureIndex + 1) % instance.template.textures.length
      thingTexture = instance.template.textures[instance.textureIndex]
    }

    uniforms = {
      ...uniforms,
      u_texture: thingTexture,
      u_worldViewProjection: mat4.create(),
    }

    const world = mat4.create()
    mat4.translate(world, world, [instance.location[0], instance.location[1], instance.location[2]])
    uniforms.u_world = world

    const worldView = mat4.multiply(mat4.create(), view, world)

    worldView[0] = 1.0
    worldView[1] = 0
    worldView[2] = 0
    worldView[8] = 0
    worldView[9] = 0
    worldView[10] = 1.0

    mat4.multiply(uniforms.u_worldViewProjection, perspective, worldView)

    gl.useProgram(programInfo.program)
    twgl.setBuffersAndAttributes(gl, programInfo, instance.template.buffers)
    twgl.setUniforms(programInfo, uniforms)
    twgl.drawBufferInfo(gl, instance.template.buffers)
  }
}