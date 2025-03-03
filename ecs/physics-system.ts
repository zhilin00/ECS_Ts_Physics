// cocos/physics/ecs/physics-system.ts

import { System } from '../../core/system';
import { Node } from '../../scene-graph';
import { director } from '../../game/director';
import { PhysicsWorld } from './physics-world';
import { PhysicsBodyComponent, ColliderComponent } from './components/physics-components';

export class PhysicsSystem extends System {
    private world: PhysicsWorld | null = null;

    constructor() {
        super();
        this._priority = System.Priority.LOW;
        this.init();
    }

    public init(): void {
        this.world = new PhysicsWorld();
        director.registerSystem('physics', this, this._priority);
    }

    public update(dt: number): void {
        // Empty implementation since we use lateUpdate
    }

    public postUpdate(dt: number): void {
        // Empty implementation since we use lateUpdate
    }

    public lateUpdate(dt: number): void {
        if (this.world) {
            this.world.step(dt);
        }
    }

    public addRigidBody(node: Node, options: Partial<PhysicsBodyComponent> = {}): PhysicsBodyComponent {
        if (!this.world) {
            throw new Error('Physics system not initialized');
        }

        const body = new PhysicsBodyComponent();
        Object.assign(body, options);

        body.id = this.world.getNextBodyId();
        body.position = node.worldPosition.clone();
        body.rotation = node.worldRotation.clone();

        node.addComponent(body);

        this.world.addBody(body);
        return body;
    }

    public addCollider(node: Node, body: PhysicsBodyComponent, options: Partial<ColliderComponent> = {}): ColliderComponent {
        const collider = new ColliderComponent();
        Object.assign(collider, options);

        if (!collider.type) collider.type = 'box';
        
        node.addComponent(collider);

        (body as any).collider = collider;
        (collider as any)._body = body;

        return collider;
    }

    public removeRigidBody(body: PhysicsBodyComponent): void {
        if (this.world) {
            const collider = (body as any).collider as ColliderComponent;
            if (collider) {
                const node = (body as any)._node as Node;
                if (node) {
                    node.removeComponent(collider);
                }
                (body as any).collider = null;
            }

            this.world.removeBody(body);

            const node = (body as any)._node as Node;
            if (node) {
                node.removeComponent(body);
            }
        }
    }

    public removeCollider(collider: ColliderComponent): void {
        const body = (collider as any)._body as PhysicsBodyComponent;
        if (body) {
            (body as any).collider = null;
            (collider as any)._body = null;
        }

        const node = (collider as any)._node as Node;
        if (node) {
            node.removeComponent(collider);
        }
    }
}
