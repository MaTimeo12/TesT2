import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Text, Sparkles, Line } from '@react-three/drei';
import * as THREE from 'three';
import ScriptEditor from './ScriptEditor';

// --- CONFIGURATION ---
const TILE_SIZE = 2;
const MAP_SIZE = 20;
const INCOME_RATE = 150; // Money per turn per point

export const UNIT_TYPES = {
  INFANTRY: { name: 'Soldier', cost: 50, hp: 50, maxHp: 50, damage: 15, range: 4, speed: 4, ap: 2, color: '#8BC34A', scale: 0.4, height: 0.5 },
  TANK: { name: 'Tank', cost: 150, hp: 200, maxHp: 200, damage: 60, range: 6, speed: 3, ap: 2, color: '#2E7D32', scale: 1, height: 0.8 },
  HELI: { name: 'Helicopter', cost: 300, hp: 120, maxHp: 120, damage: 40, range: 8, speed: 6, ap: 2, color: '#607D8B', scale: 0.8, height: 4, flying: true },
};

const TERRAIN = {
  GRASS: { color: '#4CAF50', height: 0, walkable: true },
  WATER: { color: '#2196F3', height: -0.2, walkable: false },
  MOUNTAIN: { color: '#795548', height: 1.5, walkable: false },
  BASE: { color: '#9E9E9E', height: 0.1, walkable: true },
};

// --- MAP GENERATION ---
const generateMap = () => {
  const tiles = [];
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let z = 0; z < MAP_SIZE; z++) {
      let type = 'GRASS';
      const distCenter = Math.sqrt((x - MAP_SIZE/2)**2 + (z - MAP_SIZE/2)**2);
      const noise = Math.sin(x * 0.5) * Math.cos(z * 0.5);
      
      if (distCenter > MAP_SIZE * 0.6) type = 'MOUNTAIN';
      else if (noise > 0.5) type = 'MOUNTAIN';
      else if (noise < -0.5) type = 'WATER';
      if ((x < 4 && z < 4) || (x > MAP_SIZE-5 && z > MAP_SIZE-5)) type = 'BASE';
      
      tiles.push({ x, z, type, id: `${x}-${z}` });
    }
  }
  return tiles;
};

// --- COMPONENTS ---

function Tile({ data, onClick, onHover, highlight }) {
  const { color, height } = TERRAIN[data.type];
  const [hovered, setHover] = useState(false);
  
  return (
    <mesh 
      position={[data.x * TILE_SIZE - (MAP_SIZE * TILE_SIZE)/2, height/2, data.z * TILE_SIZE - (MAP_SIZE * TILE_SIZE)/2]}
      onClick={(e) => { e.stopPropagation(); onClick(data); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); onHover(data); }}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[TILE_SIZE * 0.95, Math.max(0.1, height + 0.5), TILE_SIZE * 0.95]} />
      <meshStandardMaterial color={highlight ? '#FFD700' : (hovered ? '#FFEB3B' : color)} />
    </mesh>
  );
}

function CapturePoint({ position, owner }) {
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 4]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      <mesh position={[0, 3.5, 0]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[0.1, 1, 1.5]} />
        <meshStandardMaterial color={owner === 'player' ? '#4CAF50' : (owner === 'enemy' ? '#F44336' : '#FFF')} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[3, 3.2, 32]} />
        <meshBasicMaterial color={owner === 'player' ? '#4CAF50' : (owner === 'enemy' ? '#F44336' : '#FFF')} />
      </mesh>
    </group>
  );
}

// --- COMPONENTS ---

function UnitModel({ type, color, isSelected }) {
  if (type === 'INFANTRY') {
    return (
      <group>
        {/* Squad of 3 soldiers */}
        {[-0.3, 0, 0.3].map((x, i) => (
          <group key={i} position={[x, 0, (i%2)*0.2]}>
            <mesh position={[0, 0.4, 0]} castShadow>
              <capsuleGeometry args={[0.15, 0.8, 4]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, 0.7, 0.1]}>
              <boxGeometry args={[0.2, 0.15, 0.2]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </group>
        ))}
      </group>
    );
  } else if (type === 'TANK') {
    return (
      <group>
        {/* Body */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[1.4, 0.6, 2]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Turret */}
        <mesh position={[0, 0.8, -0.2]} castShadow>
          <boxGeometry args={[0.8, 0.5, 1]} />
          <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(1.2)} />
        </mesh>
        {/* Barrel */}
        <mesh position={[0, 0.8, 0.6]} rotation={[Math.PI/2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 1.5]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        {/* Treads */}
        <mesh position={[0.6, 0.3, 0]}>
          <boxGeometry args={[0.3, 0.6, 2.1]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[-0.6, 0.3, 0]}>
          <boxGeometry args={[0.3, 0.6, 2.1]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
    );
  } else if (type === 'HELI') {
    return (
      <group position={[0, 2, 0]}>
        {/* Body */}
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.8, 2]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Tail */}
        <mesh position={[0, 0.2, -1.5]} castShadow>
          <boxGeometry args={[0.2, 0.2, 1.5]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Rotor */}
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[4, 0.05, 0.2]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0, 0.6, 0]} rotation={[0, Math.PI/2, 0]}>
          <boxGeometry args={[4, 0.05, 0.2]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
    );
  }
  return null;
}

function CommandVisualizer({ unit }) {
  if (!unit || !unit.queue || unit.queue.length === 0) return null;

  const points = [new THREE.Vector3(...unit.position)];
  let currentPos = new THREE.Vector3(...unit.position);
  
  unit.queue.forEach(cmd => {
    if (cmd.type === 'MOVE') {
      const target = new THREE.Vector3(...cmd.target);
      // Lift line slightly to avoid z-fighting
      target.y += 0.5;
      points.push(target);
      currentPos = target;
    }
  });
  
  // Lift start point too
  points[0].y += 0.5;

  return (
    <group>
      <Line points={points} color="#FFD700" lineWidth={3} opacity={0.7} transparent />
      {points.slice(1).map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="#FFD700" opacity={0.5} transparent />
        </mesh>
      ))}
    </group>
  );
}

function Unit({ unit, isSelected, onSelect, onClick }) {
  const group = useRef();
  const stats = UNIT_TYPES[unit.type];
  const isEnemy = unit.team === 'enemy';

  // Initialize position
  useEffect(() => {
    if (group.current) {
      group.current.position.set(unit.position[0], unit.position[1], unit.position[2]);
    }
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    // Smoothly interpolate the GROUP position
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, unit.position[0], delta * 10);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, unit.position[2], delta * 10);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, unit.position[1], delta * 10);
    
    // Rotate rotor for heli
    if (unit.type === 'HELI') {
      // Simple rotation logic could go here if we had a ref to the rotor
    }
  });

  return (
    <group ref={group} onClick={(e) => { e.stopPropagation(); onClick(unit); }}>
      <UnitModel type={unit.type} color={isEnemy ? '#D32F2F' : (isSelected ? '#FFD700' : stats.color)} isSelected={isSelected} />
      
      {/* Selection Ring */}
      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Stats Bar - Now correctly follows the unit */}
      <Html position={[0, stats.height + 1.5, 0]} center>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', pointerEvents: 'none' }}>
          <div style={{ width: '40px', height: '6px', background: '#222', border: '1px solid #fff', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${(unit.hp / unit.maxHp) * 100}%`, height: '100%', background: unit.team === 'player' ? '#4CAF50' : '#F44336' }} />
          </div>
          {!isEnemy && (
            <div style={{ display: 'flex', gap: '2px' }}>
              {[...Array(stats.ap)].map((_, i) => (
                <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i < unit.ap ? '#FFD700' : '#444', border: '1px solid #000' }} />
              ))}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function Projectile({ start, end }) {
  const [active, setActive] = useState(true);
  useFrame(() => { if(active) setTimeout(() => setActive(false), 200); });
  if (!active) return null;
  
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  return <line geometry={lineGeometry}><lineBasicMaterial color="yellow" linewidth={3} /></line>;
}

export default function RTSGame({ onBack }) {
  const [mapData] = useState(generateMap());
  const [units, setUnits] = useState([]);
  const [capturePoints, setCapturePoints] = useState([
    { id: 1, position: [-15, 0, -15], owner: 'player' },
    { id: 2, position: [15, 0, 15], owner: 'enemy' },
    { id: 3, position: [0, 0, 0], owner: 'neutral' },
  ]);
  const [money, setMoney] = useState(500);
  const [turn, setTurn] = useState('player'); // 'player' | 'enemy'
  const [turnCount, setTurnCount] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [placementMode, setPlacementMode] = useState(null);
  const [projectiles, setProjectiles] = useState([]);
  const [gameState, setGameState] = useState('PLAYING');
  const [showEditor, setShowEditor] = useState(false);

  // Initial Spawn
  useEffect(() => {
    setUnits([
      { id: 1, team: 'player', type: 'INFANTRY', position: [-12, 0.5, -12], hp: 50, maxHp: 50, ap: 2, maxAp: 2 },
      { id: 2, team: 'enemy', type: 'INFANTRY', position: [12, 0.5, 12], hp: 50, maxHp: 50, ap: 2, maxAp: 2 },
    ]);
  }, []);

  // --- TURN LOGIC ---
  const endTurn = useCallback(() => {
    if (turn === 'player') {
      setTurn('enemy');
      setSelectedId(null);
      setPlacementMode(null);
    } else {
      setTurn('player');
      setTurnCount(c => c + 1);
      
      // Income & Reset AP for Player
      const income = capturePoints.filter(cp => cp.owner === 'player').length * INCOME_RATE;
      setMoney(m => m + income + 100); // Base income increased
      
      setUnits(prev => prev.map(u => {
        if (u.team === 'player') return { ...u, ap: u.maxAp };
        return u;
      }));
    }
  }, [turn, capturePoints]);

  // --- AI LOGIC ---
  useEffect(() => {
    if (turn === 'enemy' && gameState === 'PLAYING') {
      const executeAI = async () => {
        // 1. Reset Enemy AP
        setUnits(prev => prev.map(u => u.team === 'enemy' ? { ...u, ap: u.maxAp } : u));
        
        // 2. Simulate thinking time
        await new Promise(r => setTimeout(r, 1000));

        // 3. Process each enemy unit
        // Note: In a real app, we'd need a more robust state queue. 
        // Here we'll do a simplified single-pass update for all units.
        
        setUnits(currentUnits => {
          let nextUnits = currentUnits.map(u => ({...u}));
          const enemyUnits = nextUnits.filter(u => u.team === 'enemy');
          const playerUnits = nextUnits.filter(u => u.team === 'player');
          
          enemyUnits.forEach(enemy => {
            if (enemy.ap <= 0) return;

            // Find target
            let target = null;
            let minDist = Infinity;
            playerUnits.forEach(p => {
              const dist = new THREE.Vector3(...enemy.position).distanceTo(new THREE.Vector3(...p.position));
              if (dist < minDist) { minDist = dist; target = p; }
            });

            const stats = UNIT_TYPES[enemy.type];

            // Attack if in range
            if (target && minDist <= stats.range) {
              target.hp -= stats.damage;
              enemy.ap -= 1;
              setProjectiles(prev => [...prev, { id: Date.now(), start: enemy.position, end: target.position }]);
            } 
            // Move towards target or capture point
            else {
              let moveTarget = target ? target.position : [0,0,0];
              // Try to find neutral/player capture point
              const cp = capturePoints.find(c => c.owner !== 'enemy');
              if (cp) moveTarget = cp.position;

              const current = new THREE.Vector3(...enemy.position);
              const dest = new THREE.Vector3(...moveTarget);
              const dir = dest.sub(current).normalize();
              const move = dir.multiplyScalar(stats.speed); // Move distance
              
              // Simple collision check would go here, skipping for brevity
              enemy.position = [enemy.position[0] + move.x, enemy.position[1], enemy.position[2] + move.z];
              enemy.ap -= 1;
            }
          });
          
          return nextUnits.filter(u => u.hp > 0);
        });

        // 4. Spawn Units if rich
        // (Simplified: just spawn one if possible)
        if (Math.random() > 0.5) {
           setUnits(prev => [...prev, {
             id: Date.now(), team: 'enemy', type: 'TANK', 
             position: [12 + Math.random()*2, 0.8, 12 + Math.random()*2], 
             hp: 200, maxHp: 200, ap: 2, maxAp: 2, queue: []
           }]);
        }

        await new Promise(r => setTimeout(r, 1000));
        endTurn();
      };
      executeAI();
    }
  }, [turn, gameState, endTurn, capturePoints]);

  // --- INTERACTION ---
  const [isExecuting, setIsExecuting] = useState(false);
  const unitsRef = useRef(units);
  useEffect(() => { unitsRef.current = units; }, [units]);

  const executeScript = async (unitId) => {
    const unit = unitsRef.current.find(u => u.id === unitId);
    if (!unit || !unit.script || unit.script.length === 0) return;
    
    setIsExecuting(true);

    const runBlocks = async (blocks) => {
      for (const block of blocks) {
        // Always fetch latest state
        const currentUnit = unitsRef.current.find(u => u.id === unitId);
        if (!currentUnit || currentUnit.hp <= 0) break;

        if (block.type === 'MOVE') {
           const coords = block.params.target.toString().split(',').map(s => parseFloat(s.trim()));
           if (coords.length === 2 && !isNaN(coords[0])) {
              const targetX = coords[0];
              const targetZ = coords[1];
              
              await new Promise(resolve => {
                setUnits(prev => {
                  const u = prev.find(u => u.id === unitId);
                  if (!u || u.ap <= 0) return prev;
                  
                  const currentPos = new THREE.Vector3(...u.position);
                  const targetPos = new THREE.Vector3(targetX, u.position[1], targetZ);
                  const dist = currentPos.distanceTo(targetPos);
                  const stats = UNIT_TYPES[u.type];
                  
                  if (dist <= stats.speed * 2) { 
                     // Check for capture
                     setCapturePoints(prevPoints => prevPoints.map(cp => {
                        const cpPos = new THREE.Vector3(...cp.position);
                        const distToCp = new THREE.Vector2(targetX, targetZ).distanceTo(new THREE.Vector2(cpPos.x, cpPos.z));
                        if (distToCp < 4) {
                           return { ...cp, owner: u.team };
                        }
                        return cp;
                     }));

                     return prev.map(pu => pu.id === unitId ? { ...pu, position: [targetX, pu.position[1], targetZ], ap: pu.ap - 1 } : pu);
                  }
                  return prev;
                });
                setTimeout(resolve, 800);
              });
           }
        } else if (block.type === 'ATTACK') {
           await new Promise(resolve => {
             setUnits(prev => {
               const u = prev.find(u => u.id === unitId);
               if (!u || u.ap <= 0) return prev;
               
               let target = null;
               const enemies = prev.filter(eu => eu.team !== u.team);
               
               if (block.params.target === 'closest') {
                 let minDist = Infinity;
                 enemies.forEach(e => {
                   const d = new THREE.Vector3(...u.position).distanceTo(new THREE.Vector3(...e.position));
                   if (d < minDist) { minDist = d; target = e; }
                 });
               } else if (block.params.target === 'weakest') {
                 target = enemies.sort((a,b) => a.hp - b.hp)[0];
               } else if (block.params.target === 'base') {
                 // Simplified base targeting
                 target = enemies[0]; 
               }
               
               if (target) {
                 const stats = UNIT_TYPES[u.type];
                 const dist = new THREE.Vector3(...u.position).distanceTo(new THREE.Vector3(...target.position));
                 
                 if (dist <= stats.range) {
                    const nextUnits = prev.map(pu => {
                      if (pu.id === target.id) return { ...pu, hp: pu.hp - stats.damage };
                      if (pu.id === unitId) return { ...pu, ap: pu.ap - 1 };
                      return pu;
                    }).filter(pu => pu.hp > 0);
                    
                    setProjectiles(curr => [...curr, { id: Date.now(), start: u.position, end: target.position }]);
                    return nextUnits;
                 }
               }
               return prev;
             });
             setTimeout(resolve, 500);
           });
        } else if (block.type === 'REPEAT') {
            const times = parseInt(block.params.times) || 1;
            for (let i = 0; i < times; i++) {
                if (block.children) await runBlocks(block.children);
            }
        } else if (block.type === 'WAIT') {
            await new Promise(r => setTimeout(r, (parseFloat(block.params.duration) || 1) * 1000));
        }
      }
    };

    await runBlocks(unit.script);
    setIsExecuting(false);
  };

  const handleUnitClick = (unit) => {
    if (turn !== 'player' || isExecuting) return;
    
    if (unit.team === 'player') {
      setSelectedId(unit.id);
      setPlacementMode(null);
    }
  };

  const handleTileClick = (tile) => {
    if (turn !== 'player' || isExecuting) return;

    if (placementMode) {
      // Deploy Logic
      const isNearBase = capturePoints.some(cp => 
        cp.owner === 'player' && 
        new THREE.Vector3(tile.x * TILE_SIZE - 20, 0, tile.z * TILE_SIZE - 20).distanceTo(new THREE.Vector3(...cp.position)) < 10
      );
      
      if (isNearBase && TERRAIN[tile.type].walkable) {
        const type = UNIT_TYPES[placementMode];
        if (money >= type.cost) {
          setMoney(m => m - type.cost);
          const worldX = tile.x * TILE_SIZE - (MAP_SIZE * TILE_SIZE)/2;
          const worldZ = tile.z * TILE_SIZE - (MAP_SIZE * TILE_SIZE)/2;
          
          setUnits(prev => [...prev, {
            id: Date.now(), team: 'player', type: placementMode,
            position: [worldX, type.height, worldZ],
            hp: type.hp, maxHp: type.maxHp, ap: 0, maxAp: type.ap, script: []
          }]);
          setPlacementMode(null);
        }
      }
    } else if (selectedId) {
      // Immediate Move Logic (Optional fallback, but user wants script focus)
      // For now, we disable direct click-to-move to force script usage as requested "tout doit passer par le script"
      // Or we could open the editor? Let's just do nothing for now to emphasize the script button.
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#111' }}>
      {/* HUD */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button onClick={onBack} className="cta-button" style={{ pointerEvents: 'auto', fontSize: '0.8rem' }}>EXIT</button>
          <div style={{ color: '#fff', fontFamily: 'Courier New', fontWeight: 'bold' }}>
            TURN {turnCount} | <span style={{ color: turn === 'player' ? '#4CAF50' : '#F44336' }}>{turn === 'player' ? 'PLAYER PHASE' : 'ENEMY PHASE'}</span>
          </div>
        </div>
        <div style={{ color: '#4CAF50', fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'Courier New' }}>
          $ {Math.floor(money)}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '20px',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '20px', pointerEvents: 'none', zIndex: 10,
        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)'
      }}>
        {/* UNIT SHOP */}
        {turn === 'player' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {Object.entries(UNIT_TYPES).map(([key, type]) => (
              <button
                key={key}
                onClick={() => setPlacementMode(key)}
                disabled={money < type.cost}
                className="cta-button"
                style={{ 
                  pointerEvents: 'auto', 
                  background: placementMode === key ? '#FFD700' : (money < type.cost ? '#555' : 'rgba(0,0,0,0.6)'),
                  color: money < type.cost ? '#888' : '#fff',
                  border: '1px solid #fff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', fontSize: '0.8rem'
                }}
              >
                <span>{type.name}</span>
                <span style={{ color: '#4CAF50' }}>${type.cost}</span>
              </button>
            ))}
          </div>
        )}

        {/* UNIT CONTROLS */}
        {selectedId && units.find(u => u.id === selectedId)?.team === 'player' && (
          <div style={{ 
            display: 'flex', flexDirection: 'column', gap: '5px', 
            background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '8px',
            pointerEvents: 'auto', marginBottom: '0px'
          }}>
             <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>UNIT PROGRAMMING</span>
             </div>
             
             <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => setShowEditor(true)} className="cta-button" style={{ background: '#9C27B0', fontSize: '0.8rem', padding: '8px 16px' }}>OPEN EDITOR</button>
                {units.find(u => u.id === selectedId).script?.length > 0 && (
                   <button onClick={() => executeScript(selectedId)} className="cta-button" style={{ background: '#FF9800', fontSize: '0.8rem', padding: '8px 16px' }}>RUN SCRIPT</button>
                )}
             </div>
          </div>
        )}

        {/* END TURN BUTTON */}
        <button 
          onClick={endTurn}
          disabled={turn !== 'player'}
          className="cta-button"
          style={{ 
            pointerEvents: 'auto', 
            background: turn === 'player' ? '#D32F2F' : '#555',
            fontSize: '1.2rem', padding: '1rem 2rem', border: '2px solid #fff'
          }}
        >
          {turn === 'player' ? 'END TURN' : 'ENEMY ACTING...'}
        </button>
      </div>

      <Canvas shadows camera={{ position: [-20, 30, -20], fov: 45 }}>
        <color attach="background" args={['#87CEEB']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 50, 25]} intensity={1.5} castShadow />
        
        {/* Map */}
        {mapData.map(tile => (
          <Tile 
            key={tile.id} 
            data={tile} 
            onClick={handleTileClick} 
            onHover={() => {}} 
            highlight={placementMode && TERRAIN[tile.type].walkable}
          />
        ))}

        {/* Capture Points */}
        {capturePoints.map(cp => (
          <CapturePoint key={cp.id} {...cp} />
        ))}

        {/* Units */}
        {units.map(unit => (
          <Unit 
            key={unit.id} 
            unit={unit} 
            isSelected={selectedId === unit.id} 
            onClick={handleUnitClick}
          />
        ))}

        {/* Projectiles */}
        {projectiles.map(p => <Projectile key={p.id} {...p} />)}

        {/* Command Visualizer */}
        {selectedId && <CommandVisualizer unit={units.find(u => u.id === selectedId)} />}

        <OrbitControls enableZoom={true} maxPolarAngle={Math.PI / 2.2} minDistance={10} maxDistance={80} />
      </Canvas>

      {showEditor && selectedId && (
        <ScriptEditor 
          unit={units.find(u => u.id === selectedId)} 
          mapData={mapData}
          onSave={(script) => {
            setUnits(prev => prev.map(u => u.id === selectedId ? { ...u, script } : u));
            setShowEditor(false);
          }}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
