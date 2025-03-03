// cocos/physics/ecs/collision/broad-phase.ts

import { Vec3 } from '../../../core/math/vec3';
import { PhysicsBodyComponent, ColliderComponent } from '../components/physics-components';

interface AABB {
    center: Vec3;
    halfExtents: Vec3;
}

export class BroadPhase {
    private static readonly CELL_SIZE = 5;
    private spatialHash = new Map<string, Set<PhysicsBodyComponent>>();

    findPotentialCollisions(bodies: PhysicsBodyComponent[]): [PhysicsBodyComponent, PhysicsBodyComponent][] {
        this.spatialHash.clear();

        // 1. 更新空间哈希
        for (const body of bodies) {
            if (!body || body.isStatic) continue;

            const collider = (body as any).collider as ColliderComponent;
            if (!collider) continue;

            const cells = this.getCellsForAABB(collider.aabb);
            for (const cell of cells) {
                if (!this.spatialHash.has(cell)) {
                    this.spatialHash.set(cell, new Set());
                }
                this.spatialHash.get(cell)!.add(body);
            }
        }

        // 2. 找出潜在碰撞对
        const pairs = new Set<string>();
        const results: [PhysicsBodyComponent, PhysicsBodyComponent][] = [];

        for (const [_, bodiesInCell] of this.spatialHash) {
            const bodiesArray = Array.from(bodiesInCell);
            for (let i = 0; i < bodiesArray.length; i++) {
                for (let j = i + 1; j < bodiesArray.length; j++) {
                    const bodyA = bodiesArray[i];
                    const bodyB = bodiesArray[j];

                    if ((bodyA.group & bodyB.mask) === 0 ||
                        (bodyB.group & bodyA.mask) === 0) {
                        continue;
                    }

                    const pairId = `${Math.min(bodyA.id, bodyB.id)}_${Math.max(bodyA.id, bodyB.id)}`;
                    if (pairs.has(pairId)) continue;

                    const colliderA = (bodyA as any).collider as ColliderComponent;
                    const colliderB = (bodyB as any).collider as ColliderComponent;

                    if (this.testAABBOverlap(colliderA.aabb, colliderB.aabb)) {
                        pairs.add(pairId);
                        results.push([bodyA, bodyB]);
                    }
                }
            }
        }

        return results;
    }

    private getCellsForAABB(aabb: AABB): string[] {
        const cells: string[] = [];
        const minX = Math.floor((aabb.center.x - aabb.halfExtents.x) / BroadPhase.CELL_SIZE);
        const maxX = Math.floor((aabb.center.x + aabb.halfExtents.x) / BroadPhase.CELL_SIZE);
        const minY = Math.floor((aabb.center.y - aabb.halfExtents.y) / BroadPhase.CELL_SIZE);
        const maxY = Math.floor((aabb.center.y + aabb.halfExtents.y) / BroadPhase.CELL_SIZE);
        const minZ = Math.floor((aabb.center.z - aabb.halfExtents.z) / BroadPhase.CELL_SIZE);
        const maxZ = Math.floor((aabb.center.z + aabb.halfExtents.z) / BroadPhase.CELL_SIZE);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    cells.push(`${x},${y},${z}`);
                }
            }
        }

        return cells;
    }

    private testAABBOverlap(a: AABB, b: AABB): boolean {
        return Math.abs(a.center.x - b.center.x) <= (a.halfExtents.x + b.halfExtents.x) &&
            Math.abs(a.center.y - b.center.y) <= (a.halfExtents.y + b.halfExtents.y) &&
            Math.abs(a.center.z - b.center.z) <= (a.halfExtents.z + b.halfExtents.z);
    }
}
