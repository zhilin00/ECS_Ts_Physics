// cocos/physics/ecs/components/physics-components.ts

import { _decorator, Vec3, Quat } from '../../../core';
import { serializable, type } from '../../../core/data/decorators';
const { ccclass, property } = _decorator;

@ccclass('PhysicsBodyComponent')
export class PhysicsBodyComponent {
    id: number = -1;

    mass: number = 1;

    position: Vec3 = new Vec3();

    rotation: Quat = new Quat();

    velocity: Vec3 = new Vec3();

    angularVelocity: Vec3 = new Vec3();

    force: Vec3 = new Vec3();

    torque: Vec3 = new Vec3();

    friction: number = 0.5;

    restitution: number = 0.5;

    isStatic: boolean = false;

    isKinematic: boolean = false;

    isTrigger: boolean = false;

    group: number = 1;

    mask: number = -1;

    // 休眠相关
    sleepThreshold: number = 0.01;
    sleepTime: number = 0;
    isSleeping: boolean = false;

    // 缓存
    private _cachedWorldMatrix = new Float32Array(16);
    private _cachedInvMass = 1;

    constructor() {
        this._cachedInvMass = 1 / this.mass;
    }

    wake() {
        this.isSleeping = false;
        this.sleepTime = 0;
    }

    sleep() {
        this.isSleeping = true;
        Vec3.set(this.velocity, 0, 0, 0);
        Vec3.set(this.angularVelocity, 0, 0, 0);
    }
}

@ccclass('ColliderComponent')
export class ColliderComponent {

    type: 'box' | 'sphere' | 'capsule' | 'mesh' = 'box';

    center: Vec3 = new Vec3();

    size: Vec3 = new Vec3(1, 1, 1);  // for box

    radius: number = 0.5;  // for sphere/capsule

    height: number = 2;    // for capsule

    isTrigger: boolean = false;

    needCollisionCallback: boolean = false;

    // AABB缓存
    aabb = {
        center: new Vec3(),
        halfExtents: new Vec3()
    };

    // 碰撞回调
    onCollisionEnter?: (other: ColliderComponent) => void;
    onCollisionStay?: (other: ColliderComponent) => void;
    onCollisionExit?: (other: ColliderComponent) => void;

    updateAABB(position: Vec3, rotation: Quat) {
        switch (this.type) {
            case 'box':
                this.updateBoxAABB(position, rotation);
                break;
            case 'sphere':
                this.updateSphereAABB(position);
                break;
        }
    }

    private updateBoxAABB(position: Vec3, rotation: Quat) {
        const halfExtents = new Vec3();
        Vec3.multiplyScalar(halfExtents, this.size, 0.5);
        
        // Update AABB center
        Vec3.add(this.aabb.center, position, this.center);
        
        // Calculate absolute rotated half extents
        const rx = Math.abs(rotation.x * halfExtents.x);
        const ry = Math.abs(rotation.y * halfExtents.y);
        const rz = Math.abs(rotation.z * halfExtents.z);
        
        Vec3.set(
            this.aabb.halfExtents,
            rx + ry + rz,
            rx + ry + rz,
            rx + ry + rz
        );
    }

    private updateSphereAABB(position: Vec3) {
        Vec3.add(this.aabb.center, position, this.center);
        Vec3.set(this.aabb.halfExtents, this.radius, this.radius, this.radius);
    }
}
