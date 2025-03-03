// cocos/physics/ecs/physics-world.ts

import { _decorator, Vec3, Quat } from '../../core';
import { Node } from '../../scene-graph';
import { PhysicsBodyComponent, ColliderComponent } from './components/physics-components';
import { BroadPhase } from './collision/broad-phase';
import { NarrowPhase } from './collision/narrow-phase';
import { Solver } from './solver/solver';
import { type } from '../../core/data/decorators';

const { ccclass, property } = _decorator;

@ccclass('PhysicsWorld')
export class PhysicsWorld {
    public gravity = new Vec3(0, -9.81, 0);

    public maxSubSteps = 3;

    public fixedTimeStep = 1/60;

    private bodies: PhysicsBodyComponent[] = [];
    private broadphase: BroadPhase;
    private narrowphase: NarrowPhase;
    private solver: Solver;
    private nextBodyId: number = 0;

    constructor() {
        this.broadphase = new BroadPhase();
        this.narrowphase = new NarrowPhase();
        this.solver = new Solver();
    }

    public getNextBodyId(): number {
        return this.nextBodyId++;
    }

    public addBody(body: PhysicsBodyComponent): void {
        this.bodies.push(body);
    }

    public removeBody(body: PhysicsBodyComponent): void {
        const index = this.bodies.indexOf(body);
        if (index !== -1) {
            this.bodies.splice(index, 1);
        }
    }

    public step(dt: number): void {
        // 更新所有刚体
        for (const body of this.bodies) {
            if (body.isStatic || body.isSleeping) continue;

            // 更新位置
            Vec3.scaleAndAdd(body.position, body.position, body.velocity, dt);

            // 更新旋转
            const rotationDelta = new Quat();
            Quat.fromEuler(rotationDelta, 
                body.angularVelocity.x * dt,
                body.angularVelocity.y * dt,
                body.angularVelocity.z * dt
            );
            Quat.multiply(body.rotation, body.rotation, rotationDelta);

            // 应用力和扭矩
            if (!body.isKinematic) {
                // F = ma, 因此 a = F/m
                const acceleration = new Vec3();
                Vec3.multiplyScalar(acceleration, body.force, 1 / body.mass);
                Vec3.scaleAndAdd(body.velocity, body.velocity, acceleration, dt);

                // 应用扭矩（简化版本）
                Vec3.scaleAndAdd(body.angularVelocity, body.angularVelocity, body.torque, dt / body.mass);
            }

            // 重置力和扭矩
            Vec3.set(body.force, 0, 0, 0);
            Vec3.set(body.torque, 0, 0, 0);

            // 检查休眠
            const speedSquared = Vec3.lengthSqr(body.velocity);
            const angularSpeedSquared = Vec3.lengthSqr(body.angularVelocity);

            if (speedSquared < body.sleepThreshold && angularSpeedSquared < body.sleepThreshold) {
                body.sleepTime += dt;
                if (body.sleepTime > 0.5) { // 0.5秒后休眠
                    body.sleep();
                }
            } else {
                body.sleepTime = 0;
            }
        }

        // 碰撞检测和处理
        this.detectCollisions();
    }

    private detectCollisions(): void {
        // 简单的AABB碰撞检测
        for (let i = 0; i < this.bodies.length; i++) {
            const bodyA = this.bodies[i];
            const colliderA = (bodyA as any).collider as ColliderComponent;
            if (!colliderA) continue;

            // 更新碰撞体的AABB
            colliderA.updateAABB(bodyA.position, bodyA.rotation);

            for (let j = i + 1; j < this.bodies.length; j++) {
                const bodyB = this.bodies[j];
                const colliderB = (bodyB as any).collider as ColliderComponent;
                if (!colliderB) continue;

                // 更新碰撞体的AABB
                colliderB.updateAABB(bodyB.position, bodyB.rotation);

                // 检查AABB是否相交
                if (this.checkAABBCollision(colliderA.aabb, colliderB.aabb)) {
                    // 处理碰撞
                    this.handleCollision(bodyA, bodyB, colliderA, colliderB);
                }
            }
        }
    }

    private checkAABBCollision(aabbA: { center: Vec3, halfExtents: Vec3 }, aabbB: { center: Vec3, halfExtents: Vec3 }): boolean {
        return Math.abs(aabbA.center.x - aabbB.center.x) <= (aabbA.halfExtents.x + aabbB.halfExtents.x) &&
               Math.abs(aabbA.center.y - aabbB.center.y) <= (aabbA.halfExtents.y + aabbB.halfExtents.y) &&
               Math.abs(aabbA.center.z - aabbB.center.z) <= (aabbA.halfExtents.z + aabbB.halfExtents.z);
    }

    private handleCollision(bodyA: PhysicsBodyComponent, bodyB: PhysicsBodyComponent, colliderA: ColliderComponent, colliderB: ColliderComponent): void {
        // 触发碰撞回调
        if (colliderA.needCollisionCallback && colliderA.onCollisionEnter) {
            colliderA.onCollisionEnter(colliderB);
        }
        if (colliderB.needCollisionCallback && colliderB.onCollisionEnter) {
            colliderB.onCollisionEnter(colliderA);
        }

        // 如果都是触发器，不进行物理响应
        if (colliderA.isTrigger || colliderB.isTrigger) return;

        // 简单的碰撞响应（弹性碰撞）
        if (!bodyA.isStatic && !bodyB.isStatic) {
            const relativeVelocity = new Vec3();
            Vec3.subtract(relativeVelocity, bodyA.velocity, bodyB.velocity);

            const restitution = Math.min(bodyA.restitution, bodyB.restitution);
            const totalMass = bodyA.mass + bodyB.mass;

            // 计算冲量
            const impulseA = new Vec3();
            const impulseB = new Vec3();
            Vec3.multiplyScalar(impulseA, relativeVelocity, -(1 + restitution) * bodyB.mass / totalMass);
            Vec3.multiplyScalar(impulseB, relativeVelocity, (1 + restitution) * bodyA.mass / totalMass);

            // 应用冲量
            Vec3.add(bodyA.velocity, bodyA.velocity, impulseA);
            Vec3.subtract(bodyB.velocity, bodyB.velocity, impulseB);

            // 唤醒物体
            bodyA.wake();
            bodyB.wake();
        }
        // 如果其中一个是静态的
        else if (!bodyA.isStatic) {
            Vec3.multiplyScalar(bodyA.velocity, bodyA.velocity, -bodyA.restitution);
            bodyA.wake();
        }
        else if (!bodyB.isStatic) {
            Vec3.multiplyScalar(bodyB.velocity, bodyB.velocity, -bodyB.restitution);
            bodyB.wake();
        }
    }

    private syncToScene() {
        for (const body of this.bodies) {
            const node = (body as any)._node as Node;
            if (!node || body.isStatic) continue;

            node.worldPosition = body.position;
            node.worldRotation = body.rotation;
        }
    }
}
