import { engine, Transform, TextShape } from '@dcl/sdk/ecs'
import { Vector3, Color4, Color3, Quaternion } from '@dcl/sdk/math'
import { setupUI } from './ui'
import { createPlatform, createLabel } from './utils/helpers'
import { SCENE_VERSION } from './version'

// Import all test setup functions
import { setupStaircaseTest } from './tests/test01-staircase'
import { setupJumpingTest } from './tests/test02-jumping'
import { setupPlatformsTest } from './tests/test03-platforms'
import { setupStepHeightTest } from './tests/test04-stepheight'
import { setupRampsTest } from './tests/test05-ramps'
import { setupCorridorsTest } from './tests/test06-corridors'
import { setupControlsTest } from './tests/test07-controls'
import { setupTriggersTest } from './tests/test08-triggers'
import { setupTeleportTest } from './tests/test09-teleport'
import { setupContinuousTweensTest } from './tests/test10-continuous-tweens'
import { setupTextureTweensTest } from './tests/test11-texture-tweens'
import { setupBoundaryTriggerTest } from './tests/test13-boundary-trigger'
import { setupVideoStreamingTest } from './tests/test14-video-streaming'
import { setupMiscTest } from './tests/test15-misc'
import { setupMeshesTest } from './tests/test16-meshes'
import { setupMaterialsTest } from './tests/test17-materials'
import { setupGltfModelsTest } from './tests/test18-gltf-models'
import { setupAnimationsTest } from './tests/test19-animations'
import { setupMorphTargetsTest } from './tests/test20-morph-targets'

// ============================================================================
// MAIN SCENE
// ============================================================================

export function main() {
  setupUI()

  // Version label on the floor at origin
  const versionLabel = engine.addEntity()
  Transform.create(versionLabel, {
    position: Vector3.create(-2, 0.1, 0),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0)
  })
  TextShape.create(versionLabel, {
    text: `v${SCENE_VERSION}`,
    fontSize: 8,
    textColor: Color4.White(),
    outlineWidth: 0.3,
    outlineColor: Color3.Black()
  })

  console.log('Mobile Test Scene Initialized')

  // -------------------------------------------------------------------------
  // GROUND PLATFORM (Starting area)
  // -------------------------------------------------------------------------
  createPlatform(
    Vector3.create(8, 0.1, 2),
    Vector3.create(6, 0.2, 4),
    Color4.create(0.3, 0.3, 0.3, 1)
  )
  createLabel('START\nGround Level', Vector3.create(8, 1.5, 2), 1.5)

  // -------------------------------------------------------------------------
  // SETUP ALL TEST SECTORS
  // -------------------------------------------------------------------------

  // TEST 1: Fine Scale Staircase (2.0m - 2.5m heights)
  setupStaircaseTest()

  // TEST 2: Running Jump Distance
  setupJumpingTest()

  // TEST 3: Descending Platforms
  setupPlatformsTest()

  // TEST 4: Step Height Staircase (0.4m - 0.5m)
  setupStepHeightTest()

  // TEST 5: Inclined Ramps (45° - 70°)
  setupRampsTest()

  // TEST 6: Corridor Width Test
  setupCorridorsTest()

  // TEST 7: Control Mapping Test (input actions)
  setupControlsTest()

  // TEST 8: Trigger Areas (ADR-258)
  setupTriggersTest()

  // TEST 9: Wall Teleport Test
  setupTeleportTest()

  // TEST 10: Continuous Tweens (ADR-285)
  setupContinuousTweensTest()

  // TEST 11: Texture Tweens (ADR-255)
  setupTextureTweensTest()

  // TEST 13: Boundary Trigger Test
  setupBoundaryTriggerTest()

  // TEST 14: Video Streaming Test
  setupVideoStreamingTest()

  // TEST 15: MISC - VirtualCamera and InputModifier
  setupMiscTest()

  // -------------------------------------------------------------------------
  // VISUAL TEST PLATFORM
  // -------------------------------------------------------------------------

  // TEST 16: Primitive Meshes
  setupMeshesTest()

  // TEST 17: PBR Materials
  setupMaterialsTest()

  // TEST 18: GLTF/GLB Models (Static)
  setupGltfModelsTest()

  // TEST 19: GLTF Animations
  setupAnimationsTest()

  // TEST 20: Morph Targets
  setupMorphTargetsTest()

  console.log('All test platforms created')
  console.log('Tests: Staircase, Gap Jumps, Descend, Step Heights, Ramps, Corridor Width, Control Mapping, Trigger Areas, Wall Teleport, Continuous Tweens, Texture Tweens, Boundary Trigger, Video Streaming, MISC, Meshes, Materials, GLTF Models, Animations, Morph Targets')
}
