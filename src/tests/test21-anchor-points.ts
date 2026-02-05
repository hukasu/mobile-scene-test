import { AvatarAnchorPointType, AvatarAttach, engine, Entity, Material, MeshRenderer, Transform } from "@dcl/sdk/ecs";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";

export function setupAttachPointsTest() {
    createAttachment(Color4.create(1, 0.75, 0), AvatarAnchorPointType.AAPT_HEAD);
    createAttachment(Color4.create(1, 0, 0.75), AvatarAnchorPointType.AAPT_NECK);
    createAttachment(Color4.create(1, 0.5, 0.5), AvatarAnchorPointType.AAPT_SPINE);
    createAttachment(Color4.create(1, 0.25, 0.5), AvatarAnchorPointType.AAPT_SPINE1);
    createAttachment(Color4.create(1, 0.5, 0.25), AvatarAnchorPointType.AAPT_SPINE2);
    createAttachment(Color4.create(1, 0.25, 0.25), AvatarAnchorPointType.AAPT_HIP);
    createAttachment(Color4.create(0.75, 1, 0), AvatarAnchorPointType.AAPT_LEFT_SHOULDER);
    createAttachment(Color4.create(0, 1, 0.75), AvatarAnchorPointType.AAPT_LEFT_ARM);
    createAttachment(Color4.create(0.5, 1, 0.5), AvatarAnchorPointType.AAPT_LEFT_FOREARM);
    createAttachment(Color4.create(0.25, 1, 0.5), AvatarAnchorPointType.AAPT_LEFT_HAND);
    createAttachment(Color4.create(0.5, 1, 0.25), AvatarAnchorPointType.AAPT_LEFT_HAND_INDEX);
    createAttachment(Color4.create(0.75, 0, 1), AvatarAnchorPointType.AAPT_RIGHT_SHOULDER);
    createAttachment(Color4.create(0, 0.75, 1), AvatarAnchorPointType.AAPT_RIGHT_ARM);
    createAttachment(Color4.create(0.5, 0.5, 1), AvatarAnchorPointType.AAPT_RIGHT_FOREARM);
    createAttachment(Color4.create(0.25, 0.5, 1), AvatarAnchorPointType.AAPT_RIGHT_HAND);
    createAttachment(Color4.create(0.5, 0.25, 1), AvatarAnchorPointType.AAPT_RIGHT_HAND_INDEX);
    createAttachment(Color4.create(0.25, 1, 0), AvatarAnchorPointType.AAPT_LEFT_UP_LEG);
    createAttachment(Color4.create(0.25, 1, 0.25), AvatarAnchorPointType.AAPT_LEFT_LEG);
    createAttachment(Color4.create(0.75, 1, 0.75), AvatarAnchorPointType.AAPT_LEFT_FOOT);
    createAttachment(Color4.create(0, 1, 0), AvatarAnchorPointType.AAPT_LEFT_TOE_BASE);
    createAttachment(Color4.create(0.25, 0, 1), AvatarAnchorPointType.AAPT_RIGHT_UP_LEG);
    createAttachment(Color4.create(0.25, 0.25, 1), AvatarAnchorPointType.AAPT_RIGHT_LEG);
    createAttachment(Color4.create(0.75, 0.75, 1), AvatarAnchorPointType.AAPT_RIGHT_FOOT);
    createAttachment(Color4.create(0, 0, 1), AvatarAnchorPointType.AAPT_RIGHT_TOE_BASE);

}

function createAttachment(albedoColor: Color4, anchorPointId: AvatarAnchorPointType): Entity {
    const attachment = engine.addEntity();
    AvatarAttach.create(attachment, { anchorPointId });

    const child = engine.addEntity();
    Transform.create(child, {
        position: Vector3.create(0, 0, 0.125),
        scale: Vector3.create(0.25, 0.1, 0.5),
        parent: attachment,
    });
    MeshRenderer.setCylinder(child);
    Material.setPbrMaterial(child, { albedoColor });

    return attachment;
}