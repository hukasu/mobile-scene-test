import { Vector3, Color4 } from '@dcl/sdk/math'
import { setupUI } from './ui'
import { createPlatform, createLabel } from './utils/helpers'

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

// ============================================================================
// MAIN SCENE
// ============================================================================

export function main() {
  setupUI()

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

  console.log('All test platforms created')
  console.log('Tests: Staircase, Gap Jumps, Descend, Step Heights, Ramps, Corridor Width, Control Mapping, Trigger Areas, Wall Teleport, Continuous Tweens, Texture Tweens, Boundary Trigger, Video Streaming')
}
