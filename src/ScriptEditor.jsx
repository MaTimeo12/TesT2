import React, { useState, useMemo, useEffect } from 'react';
import { UNIT_TYPES } from './RTSGame';

const BLOCKS = [
  { type: 'MOVE', label: 'Move To', color: '#2196F3', description: 'Move to coordinates X,Y', params: [{ name: 'target', type: 'coord', default: '0,0' }] },
  { type: 'ATTACK', label: 'Auto Attack', color: '#F44336', description: 'Attack specific target type', params: [{ name: 'target', type: 'selection', default: 'closest', options: ['closest', 'weakest', 'base'] }] },
  { type: 'WAIT', label: 'Wait', color: '#9E9E9E', description: 'Wait for N seconds', params: [{ name: 'duration', type: 'number', default: 1 }] },
  { type: 'REPEAT', label: 'Repeat', color: '#009688', description: 'Repeat actions N times', params: [{ name: 'times', type: 'number', default: 3 }], hasChildren: true },
];

// Helper to parse coordinates "x,y"
const parseCoord = (str) => {
  const parts = str.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
  return null;
};

export default function ScriptEditor({ unit, mapData, onSave, onClose }) {
  const [script, setScript] = useState(unit.script || []);
  const [previewSteps, setPreviewSteps] = useState([]);
  const [draggedBlockId, setDraggedBlockId] = useState(null);

  // --- PREVIEW SIMULATION ---
  useEffect(() => {
    if (!unit || !mapData) return;
    
    const steps = [];
    // Use world coordinates directly
    let currentPos = { x: unit.position[0], z: unit.position[2] };
    steps.push({ ...currentPos, type: 'start', valid: true });

    const maxSpeed = UNIT_TYPES[unit.type]?.speed || 100;

    const simulate = (blocks) => {
      blocks.forEach(block => {
        if (block.type === 'MOVE') {
          const target = parseCoord(block.params.target);
          if (target) {
            const dist = Math.sqrt(Math.pow(target[0] - currentPos.x, 2) + Math.pow(target[1] - currentPos.z, 2));
            const isValid = dist <= maxSpeed;
            
            currentPos = { x: target[0], z: target[1] };
            steps.push({ ...currentPos, type: 'move', valid: isValid, dist });
          }
        } else if (block.type === 'REPEAT') {
          const times = parseInt(block.params.times) || 1;
          const safeTimes = Math.min(times, 5); 
          for(let i=0; i<safeTimes; i++) {
            if (block.children) simulate(block.children);
          }
        } else if (block.type === 'ATTACK') {
           steps.push({ ...currentPos, type: 'attack', valid: true });
        }
      });
    };

    simulate(script);
    setPreviewSteps(steps);
  }, [script, unit, mapData]);

  // --- BLOCK MANIPULATION ---
  const addBlock = (blockType) => {
    const template = BLOCKS.find(b => b.type === blockType);
    const newBlock = {
      id: Date.now() + Math.random(),
      type: blockType,
      params: template.params.reduce((acc, p) => ({ ...acc, [p.name]: p.default }), {}),
      children: template.hasChildren ? [] : undefined
    };
    setScript([...script, newBlock]);
  };

  const updateParam = (blockId, paramName, value) => {
    const updateRecursive = (list) => {
      return list.map(block => {
        if (block.id === blockId) {
          return { ...block, params: { ...block.params, [paramName]: value } };
        }
        if (block.children) {
          return { ...block, children: updateRecursive(block.children) };
        }
        return block;
      });
    };
    setScript(updateRecursive(script));
  };

  const removeBlock = (blockId) => {
    const removeRecursive = (list) => {
      return list.filter(block => {
        if (block.id === blockId) return false;
        if (block.children) {
          block.children = removeRecursive(block.children);
        }
        return true;
      });
    };
    setScript(removeRecursive(script));
  };

  const moveBlock = (dragId, hoverId) => {
    const newScript = [...script];
    const dragIndex = newScript.findIndex(b => b.id === dragId);
    const hoverIndex = newScript.findIndex(b => b.id === hoverId);

    if (dragIndex >= 0 && hoverIndex >= 0) {
      const [draggedItem] = newScript.splice(dragIndex, 1);
      newScript.splice(hoverIndex, 0, draggedItem);
      setScript(newScript);
    }
  };

  // --- RENDERERS ---
  const renderBlocks = (blocks, depth = 0) => {
    return blocks.map((block) => {
      const template = BLOCKS.find(b => b.type === block.type);
      return (
        <div 
          key={block.id} 
          draggable
          onDragStart={(e) => {
            setDraggedBlockId(block.id);
            e.dataTransfer.effectAllowed = 'move';
            e.target.style.opacity = '0.5';
          }}
          onDragEnd={(e) => {
            setDraggedBlockId(null);
            e.target.style.opacity = '1';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedBlockId && draggedBlockId !== block.id) {
              moveBlock(draggedBlockId, block.id);
            }
          }}
          style={{ 
            marginLeft: depth * 15 + 'px', 
            marginBottom: '8px',
            background: `linear-gradient(to right, ${template.color}, #333)`, 
            padding: '10px', 
            borderRadius: '6px',
            color: 'white',
            borderLeft: `4px solid ${template.color}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', gap: '5px',
            cursor: 'grab',
            border: draggedBlockId === block.id ? '2px dashed #fff' : `1px solid ${template.color}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ cursor: 'grab', fontSize: '1.2rem', opacity: 0.5 }}>☰</span>
            <span style={{ fontWeight: 'bold', textShadow: '0 1px 2px black' }}>{template.label}</span>
            {template.params.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {p.type === 'selection' ? (
                   <select 
                     value={block.params[p.name]} 
                     onChange={(e) => updateParam(block.id, p.name, e.target.value)}
                     style={{ background: '#222', color: 'white', border: '1px solid #555', borderRadius: '4px', padding: '2px 5px' }}
                   >
                     {p.options.map(o => <option key={o} value={o}>{o}</option>)}
                   </select>
                ) : (
                   <input 
                     type="text" 
                     value={block.params[p.name]} 
                     onChange={(e) => updateParam(block.id, p.name, e.target.value)}
                     placeholder={p.default}
                     style={{ width: '80px', background: '#222', color: '#4CAF50', border: '1px solid #555', borderRadius: '4px', padding: '2px 5px', fontWeight: 'bold' }}
                   />
                )}
              </div>
            ))}
            <button onClick={() => removeBlock(block.id)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#F44336', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
          
          {block.children && (
            <div style={{ 
              marginTop: '5px',
              minHeight: '30px', 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: '4px', 
              padding: '5px',
              border: '1px dashed #555'
            }}>
              {/* Nested blocks placeholder */}
              <div style={{ fontSize: '0.7rem', opacity: 0.5, textAlign: 'center', padding: '5px' }}>
                (Nested blocks not supported in V2 yet)
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  // --- PREVIEW GRID ---
  const GridPreview = () => {
    // Map coordinates are roughly -20 to 20.
    // We map them to 0-100% of the SVG container.
    // MAP_SIZE = 20, TILE_SIZE = 2. Total width = 40.
    // Range is -20 to +20.
    const mapSize = 40; 
    const toPercent = (val) => ((val + 20) / mapSize) * 100;

    return (
      <div style={{ width: '100%', height: '100%', background: '#111', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #444' }}>
        {/* Grid Lines */}
        <div style={{ 
          position: 'absolute', inset: 0, 
          backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
          backgroundSize: '20px 20px', opacity: 0.3
        }} />
        
        {/* Map Objects */}
        {mapData.map(tile => {
           // Convert grid index to world coords for display
           // worldX = tile.x * 2 - 20
           const worldX = tile.x * 2 - 20;
           const worldZ = tile.z * 2 - 20;
           
           if (tile.type === 'MOUNTAIN') {
             return (
               <div key={tile.id} style={{
                 position: 'absolute',
                 left: `${toPercent(worldX)}%`,
                 top: `${toPercent(worldZ)}%`,
                 width: '5%', height: '5%',
                 background: '#795548', opacity: 0.5
               }} />
             );
           }
           return null;
        })}

        {/* Path */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {previewSteps.map((s, i) => {
            if (i === 0) return null;
            const prev = previewSteps[i-1];
            return (
              <line 
                key={`line-${i}`}
                x1={`${toPercent(prev.x)}%`} y1={`${toPercent(prev.z)}%`}
                x2={`${toPercent(s.x)}%`} y2={`${toPercent(s.z)}%`}
                stroke={s.valid === false ? '#F44336' : '#FFD700'}
                strokeWidth="2"
                strokeDasharray={s.valid === false ? "2,2" : "4,4"}
              />
            );
          })}
          {previewSteps.map((s, i) => (
            <circle 
              key={`dot-${i}`} 
              cx={`${toPercent(s.x)}%`} cy={`${toPercent(s.z)}%`} 
              r={s.valid === false ? "4" : "3"} 
              fill={s.type === 'start' ? '#2196F3' : (s.type === 'attack' ? '#F44336' : (s.valid === false ? '#F44336' : '#FFD700'))} 
            />
          ))}
        </svg>

        {/* Unit Marker */}
        <div style={{
          position: 'absolute',
          left: `${toPercent(unit.position[0])}%`,
          top: `${toPercent(unit.position[2])}%`,
          width: '10px', height: '10px',
          background: '#2196F3', borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 10px #2196F3'
        }} />
        
        <div style={{ position: 'absolute', bottom: 10, right: 10, color: '#666', fontSize: '0.7rem' }}>
          PREVIEW (Top Down)
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.9)', zIndex: 100,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        width: '95%', height: '90%', background: '#1E1E1E', borderRadius: '12px',
        display: 'flex', overflow: 'hidden', boxShadow: '0 0 30px rgba(0,0,0,0.8)',
        border: '1px solid #333'
      }}>
        
        {/* LEFT: PALETTE */}
        <div style={{ width: '220px', background: '#252526', padding: '20px', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: '#ddd', marginTop: 0, marginBottom: '20px', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Toolbox</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            {BLOCKS.map(b => (
              <div 
                key={b.type}
                onClick={() => addBlock(b.type)}
                style={{ 
                  background: b.color, padding: '12px', borderRadius: '6px', 
                  color: 'white', cursor: 'pointer', userSelect: 'none',
                  textAlign: 'left', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  transition: 'transform 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{b.label}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '4px' }}>{b.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: SCRIPT AREA */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#1E1E1E', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            <div>
              <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>Program: {unit.type} <span style={{color:'#666'}}>#{unit.id}</span></h2>
              <div style={{ color: '#888', fontSize: '0.8rem' }}>Drag blocks to reorder</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={{ padding: '8px 16px', background: '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => onSave(script)} style={{ padding: '8px 24px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>SAVE & CLOSE</button>
            </div>
          </div>
          
          <div style={{ flex: 1, minHeight: '400px', background: '#111', borderRadius: '8px', padding: '20px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
            {script.length === 0 ? (
              <div style={{ color: '#444', textAlign: 'center', marginTop: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '3rem' }}>🧩</div>
                <div>Workspace Empty</div>
                <div style={{ fontSize: '0.8rem' }}>Click blocks on the left to start programming</div>
              </div>
            ) : (
              renderBlocks(script)
            )}
          </div>
        </div>

        {/* RIGHT: PREVIEW */}
        <div style={{ width: '350px', background: '#252526', padding: '20px', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: '#ddd', marginTop: 0, marginBottom: '10px', fontSize: '1rem' }}>Simulation</h3>
          <div style={{ flex: 1, maxHeight: '350px', marginBottom: '20px' }}>
            <GridPreview />
          </div>
          <div style={{ background: '#333', padding: '10px', borderRadius: '6px', flex: 1, overflowY: 'auto' }}>
            <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '5px', fontWeight: 'bold' }}>LOGS:</div>
            {previewSteps.map((s, i) => (
              <div key={i} style={{ fontSize: '0.75rem', color: s.valid === false ? '#F44336' : '#888', fontFamily: 'monospace', marginBottom: '2px' }}>
                {i+1}. {s.type.toUpperCase()} {s.type === 'move' ? `[${s.x.toFixed(1)}, ${s.z.toFixed(1)}]` : ''}
                {s.valid === false && <span style={{fontWeight:'bold', marginLeft:'5px'}}>⚠ TOO FAR</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
