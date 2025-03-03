// cocos/physics/ecs/solver/solver.ts

import { Vec3 } from '../../../core';
import { Contact } from '../collision/narrow-phase';

export class Solver {
    private readonly ITERATIONS = 10;
    private readonly BAUMGARTE = 0.2;
    private readonly SLOP = 0.01;

    solve(contacts: Contact[], dt: number) {
        for (let iteration = 0; iteration < this.ITERATIONS; iteration++) {
            for (const contact of contacts) {
                const { bodyA, bodyB, point, normal, depth } = contact;

                if (bodyA.isStatic && bodyB.isStatic) continue;

                // 计算相对速度
                const relativeVel = bodyB.velocity.clone().subtract(bodyA.velocity);
                const normalVel = Vec3.dot(relativeVel, normal);

                // 计算冲量
                const restitution = Math.min(bodyA.restitution, bodyB.restitution);
                const desiredVel = -normalVel * restitution;

                // Baumgarte稳定化
                const baumgarte = this.BAUMGARTE * Math.max(0, depth - this.SLOP) / dt;
                const dv = desiredVel + baumgarte;

                let normalImpulse = 0;
                if (!bodyA.isStatic) {
                    const invMassA = 1 / bodyA.mass;
                    normalImpulse -= dv * invMassA;
                    bodyA.velocity.subtract(normal.multiplyScalar(normalImpulse));
                }

                if (!bodyB.isStatic) {
                    const invMassB = 1 / bodyB.mass;
                    normalImpulse += dv * invMassB;
                    bodyB.velocity.add(normal.multiplyScalar(normalImpulse));
                }

                // 处理摩擦力
                this.solveFriction(contact, normalImpulse);
            }
        }
    }

    private solveFriction(contact: Contact, normalImpulse: number) {
        const { bodyA, bodyB, normal } = contact;

        // 计算切向速度
        const relativeVel = bodyB.velocity.clone().subtract(bodyA.velocity);
        const tangent = relativeVel.clone().subtract(
            normal.multiplyScalar(Vec3.dot(relativeVel, normal))
        );

        if (tangent.lengthSqr() > 1e-6) {
            const tangentDir = tangent.normalize();
            const friction = Math.min(bodyA.friction, bodyB.friction);
            const maxFriction = normalImpulse * friction;

            // 应用摩擦力
            if (!bodyA.isStatic) {
                bodyA.velocity.add(tangentDir.multiplyScalar(maxFriction / bodyA.mass));
            }

            if (!bodyB.isStatic) {
                bodyB.velocity.subtract(tangentDir.multiplyScalar(maxFriction / bodyB.mass));
            }
        }
    }
}
