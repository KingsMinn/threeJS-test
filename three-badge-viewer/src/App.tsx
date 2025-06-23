import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

// 배지 컴포넌트 (스프링 애니메이션 + 마우스 인터랙션)
function Badge({ badgeFile }: { badgeFile: string }) {
  const { scene } = useGLTF(badgeFile);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // 스프링 애니메이션 - 180도에서 0도로 회전 (Y축)
  const { rotationY } = useSpring({
    rotationY: hasAnimated ? 0 : Math.PI, // 180도에서 0도로
    config: {
      tension: 120,  // 스프링 탄성력
      friction: 14,  // 마찰력 (낮을수록 더 많이 튕김)
      mass: 1.2      // 질량 (무거울수록 더 천천히 움직임)
    },
    onStart: () => {
      // 애니메이션이 시작되면 1초 후에 회전 시작
      if (!hasAnimated) {
        setTimeout(() => setHasAnimated(true), 1000);
      }
    }
  });

  // 마우스 인터랙션 회전 (애니메이션 완료 후에만)
  const { mouseRotationZ, mouseRotationY } = useSpring({
    mouseRotationZ: hasAnimated ? mousePosition.y * 0.15 : 0, // 상하 기울임 (Z축)
    mouseRotationY: hasAnimated ? mousePosition.x * 0.2 : 0, // 좌우 회전 (Y축)
    config: {
      tension: 100,
      friction: 25,
      mass: 0.5
    }
  });
  
  // 컴포넌트 마운트 시 애니메이션 트리거
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // 마우스 이벤트 리스너
  useEffect(() => {
    if (!hasAnimated) return;

    const handleMouseMove = (event: MouseEvent) => {
      const canvas = event.target as HTMLCanvasElement;
      if (!canvas || canvas.tagName !== 'CANVAS') return;

      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1; // -1 to 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1; // -1 to 1
      
      setMousePosition({ x, y });
    };

    const handleMouseLeave = () => {
      setMousePosition({ x: 0, y: 0 }); // 원래 위치로 복귀
    };

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [hasAnimated]);
  
  // 그림자 설정 및 채도 향상
useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // 텍스처 부분 색상 진하게
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material: any) => {
            // 기본 채도 향상
            if (material.color) {
              const hsl = { h: 0, s: 0, l: 0 };
              material.color.getHSL(hsl);
              material.color.setHSL(hsl.h, Math.min(hsl.s * 1.3, 1.0), hsl.l);
            }
            
            // 텍스처가 있는 부분은 채도 더 높이기
            if (material.map) {
              if (material.color) {
                const hsl = { h: 0, s: 0, l: 0 };
                material.color.getHSL(hsl);
                // 텍스처 부분은 채도를 더 높이고 명도는 살짝 낮춤
                material.color.setHSL(hsl.h, Math.min(hsl.s * 1.8, 1.0), Math.max(hsl.l * 0.8, 0.1));
              }
            }
            
            material.needsUpdate = true;
          });
        }
      }
    });
  }, [scene]);
  
  return (
    <animated.group
      scale={[0.5, 0.5, 0.5]} 
      position={[0, 0, 0]}
      rotation-z={mouseRotationZ}
      rotation-y={rotationY.to(baseRotation => baseRotation + mouseRotationY.get())}
    >
      <primitive 
        object={scene} 
        castShadow
        receiveShadow
      />
    </animated.group>
  );
}

// 환경 조명 컴포넌트 (밝기 향상)
function CustomEnvironment() {
  return (
    <>
      {/* === 기존 조명들 (극한 밝기) === */}
      {/* 주변 조명 (극한 밝기) */}
      <ambientLight intensity={6.0} color="#ffffff" />
      
      {/* 메인 방향 조명 */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={5.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />
      
      {/* 보조 조명 */}
      <directionalLight
        position={[-3, 3, 2]}
        intensity={3.5}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      
      {/* 부드러운 포인트 라이트 */}
      <pointLight
        position={[0, 3, 3]}
        intensity={4.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      
      {/* 바닥 반사를 위한 부드러운 조명 */}
      <pointLight
        position={[0, -2, 0]}
        intensity={2.5}
        color="#ffffff"
      />
      
      {/* === scene-food copy.json에서 추가된 조명들 (극한 밝기) === */}
      {/* AmbientLight from scene-food.json */}
      <ambientLight intensity={3.0} color="#ffffff" />
      
      {/* DirectionalLight 1 */}
      <directionalLight
        position={[1.407, 0.407, 0.224]}
        intensity={2.5}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={500}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      
      {/* SpotLight */}
      <spotLight
        position={[0.862, 1.618, 0.905]}
        intensity={100.0}
        angle={0.714}
        decay={2}
        penumbra={0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={16.42}
        shadow-camera-near={0.5}
      />
      
      {/* DirectionalLight 2 */}
      <directionalLight
        position={[1.846, 0.104, -0.017]}
        intensity={2.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={500}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
    </>
  );
}


function App() {
  const [currentBadge, setCurrentBadge] = useState(0);
  
  const badges = [
    { name: 'Food', file: '/badge-food.glb' },
    { name: 'Art', file: '/badge-art.glb' },
    { name: 'Sport', file: '/badge-sport.glb' },
    { name: 'Tour', file: '/badge-tour.glb' },
    { name: 'Travel', file: '/badge-travel.glb' },
    { name: 'Wellbeing', file: '/badge-wellbeing.glb' }
  ];


  return (
    <div className="App" style={{ width: '100vw', height: '100vh', background: '#ffffff' }}>
      
      {/* 배지 선택 버튼들 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        padding: '20px',
        flexWrap: 'wrap'
      }}>
        {badges.map((badge, index) => (
          <button
            key={badge.name}
            onClick={() => setCurrentBadge(index)}
            style={{
              padding: '8px 16px',
              border: currentBadge === index ? '2px solid #007bff' : '1px solid #ddd',
              borderRadius: '6px',
              background: currentBadge === index ? '#007bff' : '#ffffff',
              color: currentBadge === index ? '#ffffff' : '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: currentBadge === index ? 'bold' : 'normal'
            }}
          >
            {badge.name}
          </button>
        ))}
      </div>
      
      <div style={{
        width: '400px',
        height: '400px',
        margin: '0 auto',
        border: '1px solid #ddd',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <Canvas
          shadows={{ enabled: true, type: THREE.PCFShadowMap }}
          camera={{
            position: [1.3, 0, 0], // 3배 줌인 (4 -> 1.3)
            fov: 50,
            near: 0.1,
            far: 1000
          }}
          style={{ 
            width: '100%',
            height: '100%',
            background: '#ffffff',
            filter: 'contrast(1.1) saturate(1.2)'
          }}
          gl={{ 
            alpha: false,
            antialias: true
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#ffffff', 1.0);
          }}
        >
        <Suspense fallback={null}>
          {/* 배지 모델 */}
          <Badge badgeFile={badges[currentBadge].file} />
          
          {/* 커스텀 환경 조명 */}
          <CustomEnvironment />
          
          {/* 환경 맵 (극한 밝기) */}
          <Environment preset="city" environmentIntensity={3.0} />

        </Suspense>
      </Canvas>
      </div>
    </div>
  );
}

export default App;
