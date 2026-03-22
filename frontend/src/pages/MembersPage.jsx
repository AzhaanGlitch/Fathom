import React, { useEffect, useRef } from 'react';
import { Github, Linkedin, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { motion } from 'framer-motion';
import FathomFooter from '../components/ui/fathom-footer';
import { useTheme } from '../contexts/ThemeContext.jsx';

const MembersPage = () => {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const { darkMode } = useTheme();

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(45, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 6);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    currentMount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
    
    const blueLight = new THREE.PointLight(0x0a84ff, 50, 20);
    blueLight.position.set(-2, 2, 2);
    scene.add(blueLight);
    
    const purpleLight = new THREE.PointLight(0xbf5af2, 50, 20);
    purpleLight.position.set(2, 2, 2);
    scene.add(purpleLight);

    // Load Model
    const loader = new GLTFLoader();
    let model;
    
    loader.load('/monitoring_station.glb', (gltf) => {
      model = gltf.scene;
      
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      const maxDim = Math.max(size.x, size.y, size.z);
      // Reduced scale to fit better within the background
      const scale = 9 / maxDim;
      
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      // Lower it slightly
      model.position.y -= 0.01;
      
      scene.add(model);
    }, undefined, (error) => {
      console.error('An error happened while loading the 3D model:', error);
    });

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (model) {
        model.rotation.y += 0.003; 
      }
      renderer.render(scene, camera);
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const members = [
    { name: "Parth Gupta", regNo: "24BSA10071", image: "/members/parth.png", linkedin: "https://www.linkedin.com/in/parth-gupta-4598b8324/", github: "https://github.com/parthG2209" },
    { name: "Azhaan Ali Siddiqui", regNo: "24BSA10234", image: "/members/azhaan.jpg", linkedin: "https://www.linkedin.com/in/azhaanalisiddiqui/", github: "https://github.com/AzhaanGlitch" },
    { name: "Shiv Narayan Prasad", regNo: "24BSA10252", image: "/members/shiv.png", linkedin: "https://www.linkedin.com/in/shiv-narayan-prasad06/", github: "https://github.com/shivnarayan06" },
    { name: "Chetan Yugal", regNo: "24BSA10093", image: "/members/chetan.jpg", linkedin: "https://www.linkedin.com/in/chetan-yugal-7bb862306/", github: "https://github.com/Chetan-cy1" },
    { name: "Shresth Bhargava", regNo: "24BSA10161", image: "/members/shresth.jpg", linkedin: "https://www.linkedin.com/in/shresth-bhargava/", github: "https://github.com/shresthbhargava" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className={`flex flex-col w-full min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#050505] text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Top Full Screen Section */}
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        
        {/* 3D Canvas Background to fill the complete screen */}
        <div 
          ref={mountRef} 
          className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-80"
        />
        
        {/* Back Button */}
        <div className="w-full px-8 py-8 absolute top-0 left-0 z-50">
          <button
            onClick={() => navigate('/')}
            className={`inline-flex items-center gap-2 transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
        </div>

        {/* Main Content Container */}
        <div className="z-10 relative flex flex-col items-center justify-center w-full px-4 py-20 pointer-events-none">
          
          <motion.div 
            className="flex flex-col items-center justify-center w-full max-w-[1200px] pointer-events-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Header Content */}
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h1 className={`text-5xl md:text-7xl font-extrabold mb-4 tracking-tighter drop-shadow-lg pb-2 bg-clip-text text-transparent ${darkMode ? 'bg-gradient-to-b from-white to-gray-400' : 'bg-gradient-to-b from-gray-900 to-gray-600'}`}>
                Project Exhibition - 2
              </h1>
              <h2 className={`text-xl md:text-2xl font-medium tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Group 01 VIT Bhopal University
              </h2>
            </motion.div>

            {/* Cards Content */}
            <motion.div variants={containerVariants} className="flex flex-wrap justify-center gap-6 w-full">
              {members.map((member, index) => (
                  <motion.div 
                  variants={itemVariants}
                  key={index} 
                  className={`w-[200px] sm:w-[220px] rounded-3xl p-6 flex flex-col items-center text-center
                             backdrop-blur-xl border shadow-[0_8px_32px_0_rgba(255,255,255,0.02)]
                             transition-transform duration-300 hover:-translate-y-2 cursor-default
                             ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_16px_48px_0_rgba(255,255,255,0.05)]' : 'bg-white/50 border-gray-200 hover:bg-white/70 hover:border-gray-300 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.05)]'}
                            `}
                >
                  <div className={`w-16 h-16 rounded-full border mb-4 flex items-center justify-center shadow-inner overflow-hidden ${darkMode ? 'bg-gradient-to-br from-gray-700 to-gray-900 border-gray-600' : 'bg-gradient-to-br from-gray-200 to-white border-gray-300'}`}>
                     <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className={`text-lg font-bold mb-1 truncate w-full ${darkMode ? 'text-white' : 'text-gray-900'}`}>{member.name}</h3>
                  <p className={`text-xs mb-6 font-mono tracking-wider ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{member.regNo}</p>
                  
                  <div className={`flex gap-4 w-full justify-center pt-4 border-t mt-auto ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                    <a 
                      href={member.linkedin} 
                      target="_blank" 
                      rel="noreferrer" 
                      className={`p-2.5 rounded-full transition-all duration-300 ${darkMode ? 'bg-white/5 hover:bg-[#0A66C2] text-gray-400 hover:text-white' : 'bg-black/5 hover:bg-[#0A66C2] text-gray-600 hover:text-white'}`}
                      aria-label={`${member.name} LinkedIn`}
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                    <a 
                      href={member.github} 
                      target="_blank" 
                      rel="noreferrer" 
                      className={`p-2.5 rounded-full transition-all duration-300 ${darkMode ? 'bg-white/5 hover:bg-white hover:text-black text-gray-400' : 'bg-black/5 hover:bg-black hover:text-white text-gray-600'}`}
                      aria-label={`${member.name} GitHub`}
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
        
        {/* Gradient Fade connecting to Footer */}
        <div className={`absolute w-full h-48 bottom-0 left-0 bg-gradient-to-t z-10 pointer-events-none ${darkMode ? 'from-[#050505] to-transparent' : 'from-gray-50 to-transparent'}`} />
      </div>

      {/* Footer Addition starts immediately after the full screen */}
      <div className={`w-full z-20 relative transition-colors duration-300 ${darkMode ? 'bg-[#050505]' : 'bg-gray-50'}`}>
        <FathomFooter />
      </div>

    </div>
  );
};

export default MembersPage;
