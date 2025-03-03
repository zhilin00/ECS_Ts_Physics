import { Vec3 } from '../../../core';
import { PhysicsBodyComponent } from '../components/physics-components';

interface AABB {
    center: Vec3;
    halfExtents: Vec3;
}

class QuadTreeNode {
    bounds: AABB;
    objects: PhysicsBodyComponent[] = [];
    children: QuadTreeNode[] = [];
    level: number;
    maxLevel: number = 5;
    maxObjects: number = 10;

    constructor(bounds: AABB, level: number = 0) {
        this.bounds = bounds;
        this.level = level;
    }

    split() {
        const subWidth = this.bounds.halfExtents.x;
        const subHeight = this.bounds.halfExtents.z;
        const x = this.bounds.center.x;
        const z = this.bounds.center.z;

        // 创建四个子节点
        this.children = [
            // 左上
            new QuadTreeNode({
                center: new Vec3(x - subWidth/2, 0, z - subHeight/2),
                halfExtents: new Vec3(subWidth/2, this.bounds.halfExtents.y, subHeight/2)
            }, this.level + 1),
            // 右上
            new QuadTreeNode({
                center: new Vec3(x + subWidth/2, 0, z - subHeight/2),
                halfExtents: new Vec3(subWidth/2, this.bounds.halfExtents.y, subHeight/2)
            }, this.level + 1),
            // 左下
            new QuadTreeNode({
                center: new Vec3(x - subWidth/2, 0, z + subHeight/2),
                halfExtents: new Vec3(subWidth/2, this.bounds.halfExtents.y, subHeight/2)
            }, this.level + 1),
            // 右下
            new QuadTreeNode({
                center: new Vec3(x + subWidth/2, 0, z + subHeight/2),
                halfExtents: new Vec3(subWidth/2, this.bounds.halfExtents.y, subHeight/2)
            }, this.level + 1)
        ];
    }

    getIndex(body: PhysicsBodyComponent): number {
        const collider = (body as any).collider;
        if (!collider) return -1;

        const aabb = collider.aabb;
        const verticalMidpoint = this.bounds.center.z;
        const horizontalMidpoint = this.bounds.center.x;

        // 判断物体是否完全在四个象限之一内
        const topQuadrant = (aabb.center.z - aabb.halfExtents.z < verticalMidpoint);
        const bottomQuadrant = (aabb.center.z + aabb.halfExtents.z > verticalMidpoint);
        const leftQuadrant = (aabb.center.x - aabb.halfExtents.x < horizontalMidpoint);
        const rightQuadrant = (aabb.center.x + aabb.halfExtents.x > horizontalMidpoint);

        if (leftQuadrant) {
            if (topQuadrant && !bottomQuadrant) return 0;  // 左上
            if (!topQuadrant && bottomQuadrant) return 2;  // 左下
        }
        if (rightQuadrant) {
            if (topQuadrant && !bottomQuadrant) return 1;  // 右上
            if (!topQuadrant && bottomQuadrant) return 3;  // 右下
        }

        return -1;  // 物体跨越多个象限
    }

    insert(body: PhysicsBodyComponent) {
        // 如果已经有子节点
        if (this.children.length) {
            const index = this.getIndex(body);
            if (index !== -1) {
                this.children[index].insert(body);
                return;
            }
        }

        // 添加到当前节点
        this.objects.push(body);

        // 检查是否需要分裂
        if (this.objects.length > this.maxObjects && this.level < this.maxLevel) {
            if (!this.children.length) {
                this.split();
            }

            // 尝试将对象重新分配到子节点
            let i = 0;
            while (i < this.objects.length) {
                const index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    const object = this.objects.splice(i, 1)[0];
                    this.children[index].insert(object);
                } else {
                    i++;
                }
            }
        }
    }

    retrieve(body: PhysicsBodyComponent): PhysicsBodyComponent[] {
        const result: PhysicsBodyComponent[] = [];
        const index = this.getIndex(body);

        // 如果有子节点，先检查合适的子节点
        if (this.children.length) {
            if (index !== -1) {
                result.push(...this.children[index].retrieve(body));
            } else {
                // 如果物体跨越多个象限，检查所有子节点
                for (const child of this.children) {
                    result.push(...child.retrieve(body));
                }
            }
        }

        // 添加当前节点的所有对象
        result.push(...this.objects);

        return result;
    }

    clear() {
        this.objects = [];
        for (const child of this.children) {
            child.clear();
        }
        this.children = [];
    }
}

export class QuadTree {
    private root: QuadTreeNode;

    constructor(worldSize: number) {
        this.root = new QuadTreeNode({
            center: new Vec3(0, 0, 0),
            halfExtents: new Vec3(worldSize/2, worldSize/2, worldSize/2)
        });
    }

    insert(body: PhysicsBodyComponent) {
        this.root.insert(body);
    }

    retrieve(body: PhysicsBodyComponent): PhysicsBodyComponent[] {
        return this.root.retrieve(body);
    }

    clear() {
        this.root.clear();
    }
}