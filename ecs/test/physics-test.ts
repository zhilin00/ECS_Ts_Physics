import { director } from '../../../game/director';
import { Node } from '../../../scene-graph';
import { Vec3 } from '../../../core';
import { PhysicsSystem } from '../physics-system';

export class PhysicsTest {
    private physicsSystem: PhysicsSystem;

    constructor() {
        // 初始化物理系统
        this.physicsSystem = new PhysicsSystem();
        
        // 创建一个地面
        this.createGround();
        
        // 创建一些测试物体
        this.createTestObjects();
    }

    private createGround(): void {
        const ground = new Node('Ground');
        ground.setPosition(new Vec3(0, -5, 0));
        
        // 添加刚体组件（静态）
        const groundBody = this.physicsSystem.addRigidBody(ground, {
            isStatic: true,
            mass: 0
        });
        
        // 添加碰撞体组件
        this.physicsSystem.addCollider(ground, groundBody, {
            type: 'box',
            size: new Vec3(20, 1, 20)
        });
    }

    private createTestObjects(): void {
        // 创建一个掉落的方块
        const box = new Node('Box');
        box.setPosition(new Vec3(0, 10, 0));
        
        const boxBody = this.physicsSystem.addRigidBody(box, {
            mass: 1,
            restitution: 0.5,
            friction: 0.5
        });
        
        this.physicsSystem.addCollider(box, boxBody, {
            type: 'box',
            size: new Vec3(1, 1, 1)
        });

        // 创建一个球体
        const sphere = new Node('Sphere');
        sphere.setPosition(new Vec3(2, 8, 0));
        
        const sphereBody = this.physicsSystem.addRigidBody(sphere, {
            mass: 1,
            restitution: 0.7,
            friction: 0.3
        });
        
        this.physicsSystem.addCollider(sphere, sphereBody, {
            type: 'sphere',
            radius: 0.5
        });

        // 添加碰撞回调
        const boxCollider = (boxBody as any).collider;
        if (boxCollider) {
            boxCollider.needCollisionCallback = true;
            boxCollider.onCollisionEnter = (other: any) => {
                console.log('Box collided with:', other);
            };
        }
    }
}

// 运行测试
export function runPhysicsTest(): void {
    new PhysicsTest();
} 