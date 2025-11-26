import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Stars, Cloud, OrbitControls, PerspectiveCamera, Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function Terrain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[100, 100, 64, 64]} />
      <meshStandardMaterial 
        color="#3a4a3a" 
        wireframe={true}
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}

function Vehicle({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color="#4b5320" />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[1.5, 0.8, 2]} />
        <meshStandardMaterial color="#3b4310" />
      </mesh>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[0, 20, 0]} angle={0.3} penumbra={1} intensity={2} castShadow />
    </>
  );
}

export default function Scene() {
  return (
    <Canvas shadows className="canvas-container">
      <PerspectiveCamera makeDefault position={[5, 5, 15]} fov={50} />
      <OrbitControls enableZoom={true} autoRotate={false} maxPolarAngle={Math.PI / 2 - 0.1} />
      
      <fog attach="fog" args={['#1a1a1a', 10, 100]} />
      <color attach="background" args={['#1a1a1a']} />

      <Lights />
      <Terrain />
      <Vehicle position={[0, -2, 0]} />
      <Vehicle position={[5, -2, -5]} />
      
      <Sparkles count={100} scale={12} size={2} speed={0.4} opacity={0.5} color="#d4af37" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <gridHelper args={[100, 50, 0x444444, 0x222222]} position={[0, -1.9, 0]} />
    </Canvas>
  );
}
