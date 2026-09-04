"use client";

import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group, Mesh, MeshLambertMaterial } from "three";
import { BackSide, Color } from "three";

import { DANGER_LANE, laneToWorldX } from "@/lib/game/layout";
import { seededRandom } from "@/lib/game/random";

import { useReducedMotion } from "../use-reduced-motion";
import { GAME_FONT_URL } from "./enemy-word";

export function SunsetSky() {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new Color("#241539") },
      midColor: { value: new Color("#8a4a6b") },
      bottomColor: { value: new Color("#ff9e5e") },
    }),
    [],
  );

  return (
    <mesh scale={70}>
      <sphereGeometry args={[1, 24, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying float vHeight;
          void main() {
            vHeight = normalize(position).y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 topColor;
          uniform vec3 midColor;
          uniform vec3 bottomColor;
          varying float vHeight;
          void main() {
            float h = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);
            vec3 color = h < 0.42
              ? mix(bottomColor, midColor, smoothstep(0.28, 0.42, h))
              : mix(midColor, topColor, smoothstep(0.42, 0.75, h));
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

export function BattlefieldGround() {
  const detail = useMemo(() => {
    const random = seededRandom(20260904);
    return Array.from({ length: 18 }, () => ({
      position: [
        (random() - 0.5) * 30,
        random() * 0.06,
        1.2 + random() * 5.6,
      ] as [number, number, number],
      size: 0.18 + random() * 0.34,
      tone: random(),
    }));
  }, []);
  const hills = useMemo(() => {
    const random = seededRandom(7311);
    return Array.from({ length: 9 }, (_, index) => ({
      position: [-14 + index * 3.4 + random() * 1.6, 0, -5.4 - random() * 1.4] as [
        number,
        number,
        number,
      ],
      height: 1.2 + random() * 2.2,
      width: 2.2 + random() * 1.8,
    }));
  }, []);

  return (
    <group>
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[40, 1, 14]} />
        <meshLambertMaterial color="#7fa04a" />
      </mesh>
      {/* back ridge of hill blocks for depth */}
      {hills.map((hill, index) => (
        <mesh key={index} position={[hill.position[0], hill.height / 2 - 0.4, hill.position[2]]}>
          <boxGeometry args={[hill.width, hill.height, 2.4]} />
          <meshLambertMaterial color="#5b7f3a" />
        </mesh>
      ))}
      {/* scattered voxel detail blocks near the action */}
      {detail.map((block, index) => (
        <mesh key={index} position={block.position}>
          <boxGeometry args={[block.size, block.size, block.size]} />
          <meshLambertMaterial color={block.tone > 0.5 ? "#8db055" : "#6b8f3f"} />
        </mesh>
      ))}
    </group>
  );
}

export function DriftingClouds() {
  const reducedMotion = useReducedMotion();
  const clouds = useMemo(() => {
    const random = seededRandom(424242);
    return Array.from({ length: 6 }, (_, index) => ({
      id: index,
      x: (random() - 0.5) * 30,
      y: 5.5 + random() * 3.4,
      z: -4 - random() * 8,
      speed: 0.24 + random() * 0.3,
      puffs: Array.from({ length: 3 + Math.floor(random() * 3) }, () => ({
        offset: [(random() - 0.5) * 2.6, (random() - 0.5) * 0.7, (random() - 0.5) * 1.2] as [
          number,
          number,
          number,
        ],
        size: 0.7 + random() * 1.1,
      })),
    }));
  }, []);
  const groupRefs = useRef<(Group | null)[]>([]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    clouds.forEach((cloud, index) => {
      const group = groupRefs.current[index];
      if (!group) return;
      group.position.x += delta * cloud.speed;
      if (group.position.x > 18) group.position.x = -18;
    });
  });

  return (
    <group>
      {clouds.map((cloud, index) => (
        <group
          key={cloud.id}
          ref={(group) => {
            groupRefs.current[index] = group;
          }}
          position={[cloud.x, cloud.y, cloud.z]}
        >
          {cloud.puffs.map((puff, puffIndex) => (
            <mesh key={puffIndex} position={puff.offset}>
              <boxGeometry args={[puff.size * 1.6, puff.size, puff.size]} />
              <meshLambertMaterial color="#f6e7ef" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function DangerLine() {
  const reducedMotion = useReducedMotion();
  const segmentRefs = useRef<(Mesh | null)[]>([]);
  const x = laneToWorldX(DANGER_LANE);
  const segments = useMemo(
    () => Array.from({ length: 11 }, (_, index) => 0.35 + index * 0.42),
    [],
  );

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const intensity = 0.55 + Math.sin(clock.getElapsedTime() * 2.4) * 0.3;
    segmentRefs.current.forEach((segment) => {
      const material = segment?.material as MeshLambertMaterial | undefined;
      if (material) material.emissiveIntensity = intensity;
    });
  });

  return (
    <group position={[x, 0, 0]}>
      {segments.map((y, index) => (
        <mesh
          key={y}
          position={[0, y, 0]}
          ref={(mesh) => {
            segmentRefs.current[index] = mesh;
          }}
        >
          <boxGeometry args={[0.1, 0.26, 0.1]} />
          <meshLambertMaterial color="#ff805f" emissive="#ff5722" emissiveIntensity={0.55} />
        </mesh>
      ))}
      <Text
        position={[0, 5.1, 0]}
        font={GAME_FONT_URL}
        fontSize={0.3}
        anchorX="center"
        anchorY="middle"
        color="#ffb096"
      >
        DANGER
      </Text>
    </group>
  );
}
