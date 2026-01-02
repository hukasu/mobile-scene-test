import {
  engine,
  Transform,
  MeshRenderer,
  Material,
  Tween,
  Entity
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Quaternion } from '@dcl/sdk/math'
import { createPlatform, createLabel } from '../utils/helpers'

/**
 * TEST 10: CONTINUOUS TWEENS TEST (ADR-285)
 * Testing RotateContinuous, MoveContinuous, TextureMoveContinuous
 * Located in positive Z parcels (2,5 to 5,7)
 */

/**
 * Creates orientation markers for a rotating cube.
 * Adds visual indicators so users can see the rotation direction:
 * - A white stripe on the +X face
 * - A yellow stripe on the +Z face
 * - A cyan dot on the +Y (top) face
 * This allows comparison across different engines.
 */
function addOrientationMarkers(parentEntity: Entity, cubeScale: number) {
  const halfSize = cubeScale / 2
  const stripeThickness = 0.05
  const stripeWidth = cubeScale * 0.15
  const stripeLength = cubeScale * 0.8

  // White stripe on +X face (right side)
  const stripeX = engine.addEntity()
  Transform.create(stripeX, {
    position: Vector3.create(halfSize + stripeThickness / 2, 0, 0),
    scale: Vector3.create(stripeThickness, stripeLength, stripeWidth),
    parent: parentEntity
  })
  MeshRenderer.setBox(stripeX)
  Material.setPbrMaterial(stripeX, {
    albedoColor: Color4.create(1, 1, 1, 1),
    emissiveColor: Color4.create(0.5, 0.5, 0.5),
    emissiveIntensity: 2
  })

  // Yellow stripe on +Z face (front side)
  const stripeZ = engine.addEntity()
  Transform.create(stripeZ, {
    position: Vector3.create(0, 0, halfSize + stripeThickness / 2),
    scale: Vector3.create(stripeWidth, stripeLength, stripeThickness),
    parent: parentEntity
  })
  MeshRenderer.setBox(stripeZ)
  Material.setPbrMaterial(stripeZ, {
    albedoColor: Color4.create(1, 1, 0, 1),
    emissiveColor: Color4.create(0.5, 0.5, 0),
    emissiveIntensity: 2
  })

  // Cyan dot on +Y face (top)
  const dotY = engine.addEntity()
  Transform.create(dotY, {
    position: Vector3.create(0, halfSize + stripeThickness / 2, 0),
    scale: Vector3.create(stripeWidth * 1.5, stripeThickness, stripeWidth * 1.5),
    parent: parentEntity
  })
  MeshRenderer.setBox(dotY)
  Material.setPbrMaterial(dotY, {
    albedoColor: Color4.create(0, 1, 1, 1),
    emissiveColor: Color4.create(0, 0.5, 0.5),
    emissiveIntensity: 2
  })

  // Small arrow/pointer on -X face to show initial "front" direction
  const arrowBase = engine.addEntity()
  Transform.create(arrowBase, {
    position: Vector3.create(-halfSize - stripeThickness * 2, 0, 0),
    scale: Vector3.create(stripeThickness * 3, stripeWidth, stripeWidth),
    parent: parentEntity
  })
  MeshRenderer.setBox(arrowBase)
  Material.setPbrMaterial(arrowBase, {
    albedoColor: Color4.create(1, 0.5, 0, 1),
    emissiveColor: Color4.create(0.5, 0.25, 0),
    emissiveIntensity: 2
  })
}
export function setupContinuousTweensTest() {
  const continuousTweenBaseX = 56
  const continuousTweenBaseZ = 104

  createLabel('CONTINUOUS TWEENS TEST (ADR-285)\nInfinite motion without reset', Vector3.create(continuousTweenBaseX, 8, continuousTweenBaseZ - 10), 1.5)

  // Orientation legend - helps users compare rotation direction across engines
  createLabel(
    'ORIENTATION KEY:\nWhite stripe = +X face\nYellow stripe = +Z face\nCyan dot = +Y (top)\nOrange pointer = -X face',
    Vector3.create(continuousTweenBaseX + 30, 6, continuousTweenBaseZ - 10),
    0.8
  )

  // Platform floor for continuous tween test area
  createPlatform(
    Vector3.create(continuousTweenBaseX, 0.05, continuousTweenBaseZ),
    Vector3.create(64, 0.1, 48),
    Color4.create(0.15, 0.2, 0.25, 1)
  )

  // =========================================================================
  // ROW 1: Single axis rotations (Y, X, Z) and their inverses
  // Using fromEulerDegrees to create proper quaternions where the (x,y,z)
  // components encode the rotation axis direction
  // =========================================================================
  const ctRow1Z = continuousTweenBaseZ - 12
  const rotationSpeed = 45 // degrees per second

  createLabel('ROW 1: Single Axis Rotations', Vector3.create(continuousTweenBaseX - 25, 3, ctRow1Z), 1)

  // 1.1 Rotate around Y-axis (spinning like a top)
  // fromEulerDegrees(0, angle, 0) produces quaternion with y-component for Y-axis
  const rotateY = engine.addEntity()
  Transform.create(rotateY, {
    position: Vector3.create(continuousTweenBaseX - 20, 2, ctRow1Z),
    scale: Vector3.create(1, 1, 1)
  })
  MeshRenderer.setBox(rotateY)
  Material.setPbrMaterial(rotateY, { albedoColor: Color4.create(0.8, 0.3, 0.3, 1) })
  addOrientationMarkers(rotateY, 1)
  Tween.setRotateContinuous(rotateY, Quaternion.fromEulerDegrees(0, 90, 0), rotationSpeed)
  createLabel('Y', Vector3.create(continuousTweenBaseX - 20, 4, ctRow1Z), 0.9)

  // 1.2 Rotate around Y-axis (opposite direction)
  const rotateInvY = engine.addEntity()
  Transform.create(rotateInvY, {
    position: Vector3.create(continuousTweenBaseX - 12, 2, ctRow1Z),
    scale: Vector3.create(1, 1, 1)
  })
  MeshRenderer.setBox(rotateInvY)
  Material.setPbrMaterial(rotateInvY, { albedoColor: Color4.create(0.5, 0.2, 0.2, 1) })
  addOrientationMarkers(rotateInvY, 1)
  Tween.setRotateContinuous(rotateInvY, Quaternion.fromEulerDegrees(0, -90, 0), rotationSpeed)
  createLabel('-Y', Vector3.create(continuousTweenBaseX - 12, 4, ctRow1Z), 0.9)

  // 1.3 Rotate around X-axis (tumbling forward/back)
  // fromEulerDegrees(angle, 0, 0) produces quaternion with x-component for X-axis
  const rotateX = engine.addEntity()
  Transform.create(rotateX, {
    position: Vector3.create(continuousTweenBaseX - 4, 2, ctRow1Z),
    scale: Vector3.create(1, 1, 1)
  })
  MeshRenderer.setBox(rotateX)
  Material.setPbrMaterial(rotateX, { albedoColor: Color4.create(0.3, 0.8, 0.3, 1) })
  addOrientationMarkers(rotateX, 1)
  Tween.setRotateContinuous(rotateX, Quaternion.fromEulerDegrees(90, 0, 0), rotationSpeed)
  createLabel('X', Vector3.create(continuousTweenBaseX - 4, 4, ctRow1Z), 0.9)

  // 1.4 Rotate around X-axis (opposite direction)
  const rotateInvX = engine.addEntity()
  Transform.create(rotateInvX, {
    position: Vector3.create(continuousTweenBaseX + 4, 2, ctRow1Z),
    scale: Vector3.create(1, 1, 1)
  })
  MeshRenderer.setBox(rotateInvX)
  Material.setPbrMaterial(rotateInvX, { albedoColor: Color4.create(0.2, 0.5, 0.2, 1) })
  addOrientationMarkers(rotateInvX, 1)
  Tween.setRotateContinuous(rotateInvX, Quaternion.fromEulerDegrees(-90, 0, 0), rotationSpeed)
  createLabel('-X', Vector3.create(continuousTweenBaseX + 4, 4, ctRow1Z), 0.9)

  // 1.5 Rotate around Z-axis (rolling left/right)
  // fromEulerDegrees(0, 0, angle) produces quaternion with z-component for Z-axis
  const rotateZ = engine.addEntity()
  Transform.create(rotateZ, {
    position: Vector3.create(continuousTweenBaseX + 12, 2, ctRow1Z),
    scale: Vector3.create(1, 1, 1)
  })
  MeshRenderer.setBox(rotateZ)
  Material.setPbrMaterial(rotateZ, { albedoColor: Color4.create(0.3, 0.3, 0.8, 1) })
  addOrientationMarkers(rotateZ, 1)
  Tween.setRotateContinuous(rotateZ, Quaternion.fromEulerDegrees(0, 0, 90), rotationSpeed)
  createLabel('Z', Vector3.create(continuousTweenBaseX + 12, 4, ctRow1Z), 0.9)

  // 1.6 Rotate around Z-axis (opposite direction)
  const rotateInvZ = engine.addEntity()
  Transform.create(rotateInvZ, {
    position: Vector3.create(continuousTweenBaseX + 20, 2, ctRow1Z),
    scale: Vector3.create(1, 1, 1)
  })
  MeshRenderer.setBox(rotateInvZ)
  Material.setPbrMaterial(rotateInvZ, { albedoColor: Color4.create(0.2, 0.2, 0.5, 1) })
  addOrientationMarkers(rotateInvZ, 1)
  Tween.setRotateContinuous(rotateInvZ, Quaternion.fromEulerDegrees(0, 0, -90), rotationSpeed)
  createLabel('-Z', Vector3.create(continuousTweenBaseX + 20, 4, ctRow1Z), 0.9)

  // =========================================================================
  // ROW 2: Two-axis diagonal combinations
  // Directly specify axis vector in quaternion (x,y,z) - SDK normalizes it
  // Using w=1 to avoid edge cases with w=0
  // =========================================================================
  const ctRow2Z = continuousTweenBaseZ

  createLabel('ROW 2: Diagonal Rotations', Vector3.create(continuousTweenBaseX - 25, 3, ctRow2Z), 1)

  // 2.1 XY diagonal - axis is (1,1,0) normalized = (0.707, 0.707, 0)
  const rotateXY = engine.addEntity()
  Transform.create(rotateXY, {
    position: Vector3.create(continuousTweenBaseX - 16, 2, ctRow2Z),
    scale: Vector3.create(1, 1, 1)
  })
  MeshRenderer.setBox(rotateXY)
  Material.setPbrMaterial(rotateXY, { albedoColor: Color4.create(0.8, 0.8, 0.3, 1) })
  addOrientationMarkers(rotateXY, 1)
  Tween.setRotateContinuous(rotateXY, Quaternion.create(1, 1, 0, 1), rotationSpeed)
  createLabel('XY diag', Vector3.create(continuousTweenBaseX - 16, 4, ctRow2Z), 0.9)

  // 2.2 XZ diagonal - axis is (1,0,1) normalized = (0.707, 0, 0.707)
  const rotateXZ = engine.addEntity()
  Transform.create(rotateXZ, {
    position: Vector3.create(continuousTweenBaseX - 8, 2, ctRow2Z),
    scale: Vector3.create(1, 1, 1)
  })
  MeshRenderer.setBox(rotateXZ)
  Material.setPbrMaterial(rotateXZ, { albedoColor: Color4.create(0.3, 0.8, 0.8, 1) })
  addOrientationMarkers(rotateXZ, 1)
  Tween.setRotateContinuous(rotateXZ, Quaternion.create(1, 0, 1, 1), rotationSpeed)
  createLabel('XZ diag', Vector3.create(continuousTweenBaseX - 8, 4, ctRow2Z), 0.9)

  // 2.3 YZ diagonal - axis is (0,1,1) normalized = (0, 0.707, 0.707)
  const rotateYZ = engine.addEntity()
  Transform.create(rotateYZ, {
    position: Vector3.create(continuousTweenBaseX, 2, ctRow2Z),
    scale: Vector3.create(1, 1, 1)
  })
  MeshRenderer.setBox(rotateYZ)
  Material.setPbrMaterial(rotateYZ, { albedoColor: Color4.create(0.8, 0.3, 0.8, 1) })
  addOrientationMarkers(rotateYZ, 1)
  Tween.setRotateContinuous(rotateYZ, Quaternion.create(0, 1, 1, 1), rotationSpeed)
  createLabel('YZ diag', Vector3.create(continuousTweenBaseX, 4, ctRow2Z), 0.9)

  // =========================================================================
  // ROW 3: All three axes - space diagonal rotation
  // =========================================================================
  const ctRow3Z = continuousTweenBaseZ + 8

  createLabel('ROW 3: Space Diagonal', Vector3.create(continuousTweenBaseX - 25, 3, ctRow3Z), 1)

  // 3.1 XYZ space diagonal - axis is (1,1,1) normalized = (0.577, 0.577, 0.577)
  const rotateXYZ = engine.addEntity()
  Transform.create(rotateXYZ, {
    position: Vector3.create(continuousTweenBaseX - 8, 2, ctRow3Z),
    scale: Vector3.create(1, 1, 1)
  })
  MeshRenderer.setBox(rotateXYZ)
  Material.setPbrMaterial(rotateXYZ, { albedoColor: Color4.create(1, 1, 1, 1) })
  addOrientationMarkers(rotateXYZ, 1)
  Tween.setRotateContinuous(rotateXYZ, Quaternion.create(1, 1, 1, 1), rotationSpeed)
  createLabel('XYZ diag', Vector3.create(continuousTweenBaseX - 8, 4, ctRow3Z), 0.9)

  // =========================================================================
  // ROW 4: MoveContinuous - Bullet spawner (create, move, delete)
  // =========================================================================
  const ctRow4Z = continuousTweenBaseZ + 20

  createLabel('ROW 4: MoveContinuous (bullet spawner)', Vector3.create(continuousTweenBaseX - 25, 3, ctRow4Z), 1)

  // Bullet spawner state (direction is normalized, speed is m/s)
  const bulletSpawners = [
    {
      spawnPos: Vector3.create(continuousTweenBaseX - 15, 2, ctRow4Z),
      direction: Vector3.create(1, 0, 0),  // +X direction
      speed: 8,
      color: Color4.create(1, 0.3, 0.1, 1),
      label: '+X Direction\n8 m/s',
      interval: 1.5,
      lifetime: 3
    },
    {
      spawnPos: Vector3.create(continuousTweenBaseX - 5, 2, ctRow4Z),
      direction: Vector3.create(0, 0, 1),  // +Z direction
      speed: 5,
      color: Color4.create(0.1, 1, 0.3, 1),
      label: '+Z Direction\n5 m/s',
      interval: 2,
      lifetime: 4
    },
    {
      spawnPos: Vector3.create(continuousTweenBaseX + 5, 2, ctRow4Z),
      direction: Vector3.normalize(Vector3.create(5, 3, 0)),  // Diagonal up
      speed: 6,
      color: Color4.create(0.3, 0.5, 1, 1),
      label: 'Diagonal Up\n6 m/s',
      interval: 1,
      lifetime: 2.5
    },
    {
      spawnPos: Vector3.create(continuousTweenBaseX + 15, 2, ctRow4Z),
      direction: Vector3.normalize(Vector3.create(-6, 0, 3)),  // -X +Z
      speed: 7,
      color: Color4.create(1, 1, 0.2, 1),
      label: '-X +Z\n7 m/s',
      interval: 0.8,
      lifetime: 2
    },
    {
      spawnPos: Vector3.create(continuousTweenBaseX + 25, 2, ctRow4Z),
      direction: Vector3.create(0, 1, 0),  // +Y up
      speed: 10,
      color: Color4.create(1, 0.2, 1, 1),
      label: '+Y Up\n10 m/s',
      interval: 0.5,
      lifetime: 1.5
    }
  ]

  // Track active bullets
  const activeBullets: { entity: Entity, deathTime: number }[] = []
  const spawnerTimers: number[] = bulletSpawners.map(() => 0)

  // Create labels for spawners
  bulletSpawners.forEach((spawner, index) => {
    // Spawn point marker
    const marker = engine.addEntity()
    Transform.create(marker, {
      position: spawner.spawnPos,
      scale: Vector3.create(0.5, 0.5, 0.5)
    })
    MeshRenderer.setBox(marker)
    Material.setPbrMaterial(marker, {
      albedoColor: Color4.create(0.3, 0.3, 0.3, 1)
    })
    createLabel(spawner.label, Vector3.create(spawner.spawnPos.x, 5, spawner.spawnPos.z), 0.8)
  })

  // System to spawn and manage bullets
  let globalTime = 0
  engine.addSystem((dt: number) => {
    globalTime += dt

    // Spawn new bullets
    bulletSpawners.forEach((spawner, index) => {
      spawnerTimers[index] += dt
      if (spawnerTimers[index] >= spawner.interval) {
        spawnerTimers[index] = 0

        // Create bullet entity
        const bullet = engine.addEntity()
        Transform.create(bullet, {
          position: Vector3.create(spawner.spawnPos.x, spawner.spawnPos.y, spawner.spawnPos.z),
          scale: Vector3.create(0.4, 0.4, 0.4)
        })
        MeshRenderer.setSphere(bullet)
        Material.setPbrMaterial(bullet, {
          albedoColor: spawner.color
        })

        // Use MoveContinuous - moves indefinitely in the direction at given speed
        Tween.setMoveContinuous(bullet, spawner.direction, spawner.speed)

        // Track bullet for deletion
        activeBullets.push({
          entity: bullet,
          deathTime: globalTime + spawner.lifetime
        })
      }
    })

    // Delete expired bullets
    for (let i = activeBullets.length - 1; i >= 0; i--) {
      if (globalTime >= activeBullets[i].deathTime) {
        engine.removeEntity(activeBullets[i].entity)
        activeBullets.splice(i, 1)
      }
    }
  })

  createLabel(
    'Bullets spawn, move continuously,\nthen delete after lifetime',
    Vector3.create(continuousTweenBaseX, 1, ctRow4Z - 6),
    0.7
  )
}
