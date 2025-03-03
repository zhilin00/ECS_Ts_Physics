// cocos/physics/ecs/collision/narrow-phase.ts

import { Vec3 } from '../../../core';
import { PhysicsBodyComponent, ColliderComponent } from '../components/physics-components';

export interface Contact {
    bodyA: PhysicsBodyComponent;
    bodyB: PhysicsBodyComponent;
    point: Vec3;
    normal: Vec3;
    depth: number;
    isNew: boolean;
}

export class NarrowPhase {
    private contactPool: Contact[] = [];
    private activeContacts = new Map<string, Contact>();
    private lastFrameContacts = new Set<string>();

    detectCollisions(pairs: [PhysicsBodyComponent, PhysicsBodyComponent][]): Contact[] {
        const currentContacts = new Set<string>();

        for (const [bodyA, bodyB] of pairs) {
            const colliderA = (bodyA as any).collider as ColliderComponent;
            const colliderB = (bodyB as any).collider as ColliderComponent;

            if (!colliderA || !colliderB) continue;

            const contactId = `${Math.min(bodyA.id, bodyB.id)}_${Math.max(bodyA.id, bodyB.id)}`;
            currentContacts.add(contactId);

            let contact = this.activeContacts.get(contactId);
            const isNew = !contact;

            switch(colliderA.type) {
                case 'sphere':
                    if (colliderB.type === 'sphere') {
                        contact = this.sphereSphere(bodyA, bodyB, colliderA, colliderB, contact) || undefined;
                    }
                    break;
                case 'box':
                    if (colliderB.type === 'box') {
                        contact = this.boxBox(bodyA, bodyB, colliderA, colliderB, contact) || undefined;
                    } else if (colliderB.type === 'sphere') {
                        contact = this.boxSphere(bodyA, bodyB, colliderA, colliderB, contact) || undefined;
                    }
                    break;
            }

            if (contact) {
                contact.isNew = isNew;
                this.activeContacts.set(contactId, contact);
            }
        }

        // 处理结束的碰撞
        for (const contactId of this.lastFrameContacts) {
            if (!currentContacts.has(contactId)) {
                const contact = this.activeContacts.get(contactId)!;
                const colliderA = (contact.bodyA as any).collider as ColliderComponent;
                const colliderB = (contact.bodyB as any).collider as ColliderComponent;

                if (colliderA.onCollisionExit) colliderA.onCollisionExit(colliderB);
                if (colliderB.onCollisionExit) colliderB.onCollisionExit(colliderA);

                this.activeContacts.delete(contactId);
                this.contactPool.push(contact);
            }
        }

        this.lastFrameContacts = currentContacts;

        return Array.from(this.activeContacts.values());
    }

    private sphereSphere(
        bodyA: PhysicsBodyComponent,
        bodyB: PhysicsBodyComponent,
        colliderA: ColliderComponent,
        colliderB: ColliderComponent,
        existingContact?: Contact
    ): Contact | null {
        const posA = new Vec3();
        Vec3.add(posA, bodyA.position, colliderA.center);
        
        const posB = new Vec3();
        Vec3.add(posB, bodyB.position, colliderB.center);

        const radiusSum = colliderA.radius + colliderB.radius;
        const delta = new Vec3();
        Vec3.subtract(delta, posB, posA);
        const distanceSquared = Vec3.lengthSqr(delta);

        if (distanceSquared < radiusSum * radiusSum) {
            const distance = Math.sqrt(distanceSquared);
            const normal = new Vec3();
            Vec3.normalize(normal, delta);
            
            const point = new Vec3();
            Vec3.scaleAndAdd(point, posA, normal, colliderA.radius);

            let contact: Contact;
            if (existingContact) {
                contact = existingContact;
                Vec3.copy(contact.point, point);
                Vec3.copy(contact.normal, normal);
                contact.depth = radiusSum - distance;
            } else {
                contact = this.contactPool.pop() || {
                    bodyA,
                    bodyB,
                    point: new Vec3(),
                    normal: new Vec3(),
                    depth: radiusSum - distance,
                    isNew: true
                };
                Vec3.copy(contact.point, point);
                Vec3.copy(contact.normal, normal);
            }

            if (contact.isNew) {
                if (colliderA.onCollisionEnter) colliderA.onCollisionEnter(colliderB);
                if (colliderB.onCollisionEnter) colliderB.onCollisionEnter(colliderA);
            } else {
                if (colliderA.onCollisionStay) colliderA.onCollisionStay(colliderB);
                if (colliderB.onCollisionStay) colliderB.onCollisionStay(colliderA);
            }

            return contact;
        }

        return null;
    }

    private boxBox(
        bodyA: PhysicsBodyComponent,
        bodyB: PhysicsBodyComponent,
        colliderA: ColliderComponent,
        colliderB: ColliderComponent,
        existingContact?: Contact
    ): Contact | null {
        // SAT算法实现盒子碰撞检测
        // TODO: 实现盒子碰撞检测
        return null;
    }

    private boxSphere(
        bodyA: PhysicsBodyComponent,
        bodyB: PhysicsBodyComponent,
        colliderA: ColliderComponent,
        colliderB: ColliderComponent,
        existingContact?: Contact
    ): Contact | null {
        // TODO: 实现盒子与球碰撞检测
        return null;
    }
}
