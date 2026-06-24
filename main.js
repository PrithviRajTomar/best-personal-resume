/*
    ========================================================
    Main JavaScript for Prithvi Raj Tomar Portfolio
    Handles 3D Scene (Three.js) and DOM Interactions
    ========================================================
*/

document.addEventListener('DOMContentLoaded', () => {
    initCustomCursor();
    initThreeJS();
    initScrollAnimations();
    initContactForm();
    initNavbarCollapse();
});

/**
 * Initializes the Three.js 3D element in the hero section.
 * Creates a minimalist, rotating geometric shape.
 */
function initThreeJS() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // 1. Setup Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    
    // Transparent background to blend with CSS
    // scene.background = new THREE.Color(0xf8f9fa); 
    
    const camera = new THREE.PerspectiveCamera(
        75, 
        container.clientWidth / container.clientHeight, 
        0.1, 
        1000
    );
    // Position camera closer to make the object appear much bigger
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Sharp rendering on high DPI screens
    container.appendChild(renderer.domElement);

    // 2. Create Geometry and Material for AI Neural Network (Plexus)
    const aiNetwork = new THREE.Group();
    
    const particleCount = 200;
    const radius = 3.5;
    
    // Array to hold particle positions
    const pPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        // Random point inside a sphere to represent data nodes
        const r = radius * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        
        pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    const pGeometry = new THREE.BufferGeometry();
    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    
    // Points (Nodes)
    const pMaterial = new THREE.PointsMaterial({
        color: 0x111111,
        size: 0.06,
        transparent: true,
        opacity: 0.7
    });
    
    const particles = new THREE.Points(pGeometry, pMaterial);
    aiNetwork.add(particles);

    // Lines (Neural Connections)
    const linePositions = [];
    // Connect particles that are close to each other
    for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
            const dx = pPositions[i * 3] - pPositions[j * 3];
            const dy = pPositions[i * 3 + 1] - pPositions[j * 3 + 1];
            const dz = pPositions[i * 3 + 2] - pPositions[j * 3 + 2];
            const distSq = dx*dx + dy*dy + dz*dz;
            
            // If nodes are close, draw a synaptic connection
            if (distSq < 2.5) { 
                linePositions.push(
                    pPositions[i * 3], pPositions[i * 3 + 1], pPositions[i * 3 + 2],
                    pPositions[j * 3], pPositions[j * 3 + 1], pPositions[j * 3 + 2]
                );
            }
        }
    }
    
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    
    const lineMaterial = new THREE.LineSegments({
        color: 0x666666,
        transparent: true,
        opacity: 0.15
    });
    
    // Note: LineSegments requires LineBasicMaterial
    const lineBasicMaterial = new THREE.LineBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.12
    });

    const lines = new THREE.LineSegments(lineGeometry, lineBasicMaterial);
    aiNetwork.add(lines);
    
    scene.add(aiNetwork);

    // 3. Handle Window Resize
    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });

    // 4. Mouse interaction variables
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    });

    // 5. Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Auto-rotation of the neural network
        aiNetwork.rotation.x += 0.001;
        aiNetwork.rotation.y += 0.002;

        // Subtle mouse interaction (easing)
        targetX = mouseX * 0.0005;
        targetY = mouseY * 0.0005;
        
        aiNetwork.rotation.y += 0.05 * (targetX - aiNetwork.rotation.y);
        aiNetwork.rotation.x += 0.05 * (targetY - aiNetwork.rotation.x);

        renderer.render(scene, camera);
    }

    animate();
}

/**
 * Initializes IntersectionObserver for fade-in scroll animations.
 */
function initScrollAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in-up');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => observer.observe(el));
}

/**
 * Handles the contact form submission.
 */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('button[type="submit"]');
        const span = btn.querySelector('span');
        const icon = btn.querySelector('i');
        
        const originalText = span.innerText;
        
        // Loading state
        span.innerText = 'Sending...';
        icon.className = 'bi bi-hourglass-split spinner-border spinner-border-sm';
        btn.disabled = true;
        
        setTimeout(() => {
            // Success state
            btn.classList.remove('btn-dark');
            btn.classList.add('btn-success');
            span.innerText = 'Sent Successfully!';
            icon.className = 'bi bi-check-circle-fill';
            
            form.reset();
            
            // Reset button after 3 seconds
            setTimeout(() => {
                btn.classList.remove('btn-success');
                btn.classList.add('btn-dark');
                span.innerText = originalText;
                icon.className = 'bi bi-send-fill';
                btn.disabled = false;
            }, 3000);
            
        }, 1500); // simulate network delay
    });
}

/**
 * Ensures the mobile navbar collapses when a link is clicked.
 */
function initNavbarCollapse() {
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link, .navbar-nav .btn');
    const menuToggle = document.getElementById('navbarNav');
    
    if (typeof bootstrap !== 'undefined' && menuToggle) {
        // Initialize bootstrap collapse
        const bsCollapse = new bootstrap.Collapse(menuToggle, { toggle: false });
        
        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                if (menuToggle.classList.contains('show')) {
                    bsCollapse.toggle();
                }
            });
        });
    }
}

/**
 * Initializes the custom techy cursor effect.
 */
function initCustomCursor() {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Dot follows instantly
        dot.style.left = `${mouseX}px`;
        dot.style.top = `${mouseY}px`;
    });

    function animateRing() {
        // Ring follows with a delay (lerp interpolation)
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        
        ring.style.left = `${ringX}px`;
        ring.style.top = `${ringY}px`;
        
        requestAnimationFrame(animateRing);
    }
    animateRing();

    // Add hover effect to interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .btn, .nav-link, input, textarea, .project-card, .hover-card');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            document.body.classList.add('cursor-hover');
        });
        el.addEventListener('mouseleave', () => {
            document.body.classList.remove('cursor-hover');
        });
    });
}
