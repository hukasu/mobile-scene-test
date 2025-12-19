import {
  engine,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  VideoPlayer,
  GltfContainer,
  PointerEvents,
  PointerEventType,
  InputAction,
  inputSystem,
  TextShape,
  Billboard
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Quaternion, Color3 } from '@dcl/sdk/math'
import { createPlatform, createLabel } from '../utils/helpers'

/**
 * TEST 14: VIDEO STREAMING TEST
 * Testing VideoPlayer with a Blender Foundation movie.
 * Located at parcel 7,-7 (X = 112, Z = -112)
 */
export function setupVideoStreamingTest() {
  // Parcel 7,-7: 7 * 16 = 112, -7 * 16 = -112
  const baseX = 112
  const baseZ = -112

  createLabel('VIDEO STREAMING TEST\nBlender Foundation - Sintel (2010)', Vector3.create(baseX + 8, 12, baseZ + 8), 3)

  // Platform floor (4x larger: 64x64)
  createPlatform(
    Vector3.create(baseX + 32, 0.05, baseZ + 32),
    Vector3.create(64, 0.1, 64),
    Color4.create(0.15, 0.15, 0.2, 1)
  )

  // =========================================================================
  // SEATS - From goerli-plaza reference
  // =========================================================================
  const seats = engine.addEntity()
  Transform.create(seats, {
    position: Vector3.create(baseX + 8, 0, baseZ),
    rotation: Quaternion.fromEulerDegrees(0, 0, 0),
    scale: Vector3.create(1, 1, 1)
  })
  GltfContainer.create(seats, {
    src: 'assets/seats.glb'
  })

  // =========================================================================
  // VIDEO PLAYER - Sintel (Blender Foundation 2010)
  // =========================================================================

  // Create the video player entity (starts paused)
  const videoPlayerEntity = engine.addEntity()
  VideoPlayer.create(videoPlayerEntity, {
    src: 'https://archive.org/download/Sintel/sintel-2048-stereo.mp4',
    playing: false,
    loop: true,
    volume: 0.5
  })

  // Track play state
  let isPlaying = false

  // Create video texture from the player
  const videoTexture = Material.Texture.Video({ videoPlayerEntity: videoPlayerEntity })

  // Video material with emissive for better visibility
  const videoMaterial = {
    texture: videoTexture,
    roughness: 1.0,
    specularIntensity: 0,
    metallic: 0,
    emissiveTexture: videoTexture,
    emissiveIntensity: 0.8,
    emissiveColor: Color3.White()
  }

  // =========================================================================
  // GLTF SCREEN - Using screen.glb from goerli-plaza
  // Based on reference scene transforms
  // =========================================================================

  // Screen body (GLTF model) - positioned at center back of parcel
  const screenBody = engine.addEntity()
  Transform.create(screenBody, {
    position: Vector3.create(baseX + 8, 0.05, baseZ + 6),
    scale: Vector3.create(1, 1, 1)
  })
  GltfContainer.create(screenBody, {
    src: 'assets/screen.glb'
  })

  // Screen display parent (offset from screen body)
  // Reference: y: 6.15, scale: 0.63
  const screenDisplay = engine.addEntity()
  Transform.create(screenDisplay, {
    position: Vector3.create(baseX + 8, 6.15 * 0.63 + 0.05, baseZ + 14),
    scale: Vector3.create(0.63, 0.63, 0.63)
  })

  // Video plane on the screen
  // Reference: position relative (0, 1.15, 6), scale (18.63, 10.48, 1.59), slight tilt
  const videoScreen = engine.addEntity()
  Transform.create(videoScreen, {
    position: Vector3.create(baseX + 8, 4.8, baseZ + 10.2),
    rotation: Quaternion.fromEulerDegrees(-8.6, 0, 0),
    scale: Vector3.create(11.7, 6.6, 1)
  })
  MeshRenderer.setPlane(videoScreen)
  MeshCollider.setPlane(videoScreen)
  Material.setPbrMaterial(videoScreen, videoMaterial)

  // Add pointer events for play/pause toggle
  PointerEvents.create(videoScreen, {
    pointerEvents: [
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: {
          button: InputAction.IA_POINTER,
          hoverText: 'Click to PLAY'
        }
      }
    ]
  })

  // Status label for play state
  const playStatusLabel = engine.addEntity()
  Transform.create(playStatusLabel, {
    position: Vector3.create(baseX + 8, 9, baseZ + 10)
  })
  TextShape.create(playStatusLabel, {
    text: 'PAUSED - Click screen to play',
    fontSize: 4,
    textColor: Color4.Yellow()
  })
  Billboard.create(playStatusLabel)

  // System to handle play/pause toggle
  engine.addSystem(() => {
    const cmd = inputSystem.getInputCommand(
      InputAction.IA_POINTER,
      PointerEventType.PET_DOWN,
      videoScreen
    )

    if (cmd) {
      isPlaying = !isPlaying
      const videoPlayer = VideoPlayer.getMutable(videoPlayerEntity)
      videoPlayer.playing = isPlaying

      // Update hover text and status label
      const pointerEvents = PointerEvents.getMutable(videoScreen)
      if (pointerEvents.pointerEvents && pointerEvents.pointerEvents[0]?.eventInfo) {
        pointerEvents.pointerEvents[0].eventInfo.hoverText = isPlaying ? 'Click to PAUSE' : 'Click to PLAY'
      }

      TextShape.getMutable(playStatusLabel).text = isPlaying
        ? 'PLAYING - Click screen to pause'
        : 'PAUSED - Click screen to play'
      TextShape.getMutable(playStatusLabel).textColor = isPlaying
        ? Color4.Green()
        : Color4.Yellow()

      console.log(`VIDEO: ${isPlaying ? 'PLAY' : 'PAUSE'}`)
    }
  })

  createLabel('GLTF Screen + Video\n(Click to Play/Pause)', Vector3.create(baseX + 8, 10.5, baseZ + 14), 2)

  // =========================================================================
  // SIDE SCREEN - Smaller screen on the left
  // =========================================================================
  const sideScreen = engine.addEntity()
  Transform.create(sideScreen, {
    position: Vector3.create(baseX + 1, 3, baseZ + 8),
    rotation: Quaternion.fromEulerDegrees(0, 90, 0),
    scale: Vector3.create(5, 3, 1)
  })
  MeshRenderer.setPlane(sideScreen)
  Material.setPbrMaterial(sideScreen, videoMaterial)

  createLabel('Side Screen', Vector3.create(baseX + 1, 6, baseZ + 8), 2)

  // =========================================================================
  // VIDEO CUBE - Cube with video on all sides
  // =========================================================================
  const videoCube = engine.addEntity()
  Transform.create(videoCube, {
    position: Vector3.create(baseX + 15, 2, baseZ + 4),
    scale: Vector3.create(2, 2, 2)
  })
  MeshRenderer.setBox(videoCube)
  Material.setPbrMaterial(videoCube, videoMaterial)

  createLabel('Video Cube', Vector3.create(baseX + 15, 5, baseZ + 4), 2)

  // =========================================================================
  // FLOOR PROJECTION
  // =========================================================================
  const floorScreen = engine.addEntity()
  Transform.create(floorScreen, {
    position: Vector3.create(baseX + 8, 0.11, baseZ + 4),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0),
    scale: Vector3.create(6, 4, 1)
  })
  MeshRenderer.setPlane(floorScreen)
  Material.setPbrMaterial(floorScreen, videoMaterial)

  createLabel('Floor Projection', Vector3.create(baseX + 8, 1, baseZ + 4), 1.6)

  // =========================================================================
  // Info labels
  // =========================================================================
  createLabel(
    'Video: Sintel (2010)\n(c) Blender Foundation | CC BY 3.0',
    Vector3.create(baseX + 8, 0.5, baseZ + 12),
    1.4
  )

  createLabel('TEST 14: Video Streaming\n(Parcel 7,-7)', Vector3.create(baseX - 2, 3, baseZ + 8), 2)
}
