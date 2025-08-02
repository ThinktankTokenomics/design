// Custom Cursor Logic - Placed outside DOMContentLoaded to ensure it runs even if other scripts fail or are slow
const customCursor = document.getElementById('custom-cursor');
document.addEventListener('mousemove', (e) => {
    customCursor.style.left = `${e.clientX}px`;
    customCursor.style.top = `${e.clientY}px`;
});
document.addEventListener('mouseover', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.classList.contains('data-core') || e.target.closest('.image-wrapper')) {
        customCursor.classList.add('cursor-active');
    } else {
        customCursor.classList.remove('cursor-active');
    }
});
document.addEventListener('mouseout', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.classList.contains('data-core') || e.target.closest('.image-wrapper')) {
        customCursor.classList.remove('cursor-active');
    }
    // Also remove cursor-active if mouse leaves the document entirely
    if (!e.relatedTarget || e.relatedTarget.nodeName === 'HTML') {
        customCursor.classList.remove('cursor-active');
    }
});
document.addEventListener('mousedown', () => { customCursor.classList.add('cursor-pulse'); });
document.addEventListener('mouseup', () => { customCursor.classList.remove('cursor-pulse'); });
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.classList.contains('data-core')) {
        playClickSound();
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const activateButton = document.getElementById('activate-system-button');
    const mainContent = document.getElementById('main-content');
    const dataCores = document.querySelectorAll('.data-core');
    const pages = document.querySelectorAll('.page-content');
    const returnButtons = document.querySelectorAll('.return-button');
    const chatInput = document.getElementById('chat-input');
    const chatForm = document.getElementById('ai-chat-form');
    const aiResponse = document.getElementById('ai-response');
    const processingIndicator = document.getElementById('processing-indicator');
    const systemLogs = document.getElementById('system-logs');
    const scalingText = document.getElementById('scaling-text');
    const scrollTextPage = document.getElementById('scroll-text-page');
    const imageHoverPage = document.getElementById('image-hover-page');
    const lightningFlash = document.getElementById('lightning-flash');
    const stormOverlay = document.getElementById('storm-overlay');

    let activePage = null;
    let threeJSAnimator = null;
    let vantaEffectMain = null; // For homepage birds
    let vantaEffectPage2 = null; // For page 2 birds (visualizer)
    let lightningInterval = null;
    let stormNoise = null; // Tone.js NoiseSynth for rumble

    // --- Tone.js instances ---
    const clickSynth = new Tone.Synth().toDestination();
    let ambientSynth = null; // Will be initialized on activation
    const mysteryBoomSynth = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: {
            attack: 0.01,
            decay: 0.2,
            sustain: 0.0,
            release: 0.5
        }
    }).toDestination();

    function playClickSound() {
        clickSynth.triggerAttackRelease("C4", "8n");
    }

    function startAmbientSound() {
        if (!ambientSynth) {
            ambientSynth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "sine" },
                envelope: {
                    attack: 2,
                    decay: 1,
                    sustain: 0.5,
                    release: 2
                },
                volume: -20 // Very subtle volume
            }).toDestination();

            // Loop a low, atmospheric chord
            new Tone.Loop(time => {
                ambientSynth.triggerAttackRelease(["C2", "G2", "C3"], "4n", time);
            }, "4s").start(0);

            Tone.Transport.start();
        }
    }

    function stopAmbientSound() {
        if (ambientSynth) {
            Tone.Transport.stop();
            ambientSynth.dispose();
            ambientSynth = null;
        }
    }

    // --- Storm Effect Sounds and Visuals ---
    function startStormEffect() {
        // Ensure Tone.js context is running for audio effects
        if (Tone.context.state !== 'running') {
            Tone.start();
        }

        // Visual storm overlay fade in
        gsap.to(stormOverlay, { opacity: 0.2, duration: 1 });

        // Lightning flashes
        function triggerLightning() {
            gsap.timeline()
                .to(lightningFlash, {
                    opacity: 0.8,
                    duration: 0.05, // Quick flash on
                    ease: "power1.out"
                })
                .to(lightningFlash, {
                    opacity: 0,
                    duration: 0.2, // Quick flash off
                    delay: 0.05, // Short pause at full brightness
                    ease: "power1.in"
                });

            // Subtle lightning sound (short burst of noise)
            if (Tone.context.state === 'running') {
                const lightningNoise = new Tone.NoiseSynth({
                    envelope: {
                        attack: 0.005,
                        decay: 0.1,
                        sustain: 0,
                        release: 0.2
                    },
                    noise: {
                        type: 'white'
                    },
                    volume: -10 // Adjust volume as needed
                }).toDestination();
                lightningNoise.triggerAttackRelease("4n");
            }

            // BOOM EFFECT FOR LIGHTNING
            if (Tone.context.state === 'running') {
                mysteryBoomSynth.triggerAttackRelease("A3", "16n");
            }
        }

        // Random interval for lightning
        // Clear any existing interval to prevent duplicates
        if (lightningInterval) clearInterval(lightningInterval);
        lightningInterval = setInterval(() => {
            const delay = Math.random() * 5000 + 1000; // 1 to 6 seconds delay before next flash
            setTimeout(triggerLightning, delay);
        }, 6000); // Check every 6 seconds for a new lightning strike cycle

        // Continuous low rumble sound
        if (!stormNoise) {
            stormNoise = new Tone.NoiseSynth({
                noise: {
                    type: 'brown' // Brown noise for a deeper rumble
                },
                envelope: {
                    attack: 2,
                    decay: 5,
                    sustain: 0.5,
                    release: 10 // Long release for continuous feel
                },
                volume: -30 // Very subtle rumble
            }).toDestination();

            stormNoise.triggerAttack(); // Start continuous noise
        }
    }

    function stopStormEffect() {
        gsap.to(stormOverlay, { opacity: 0, duration: 0.5 });
        clearInterval(lightningInterval);
        lightningInterval = null; // Clear the reference
        if (stormNoise) {
            stormNoise.triggerRelease();
            stormNoise.dispose();
            stormNoise = null;
        }
    }


    // --- System Activation & Transitions ---
    // Only try to register GSAP plugin if GSAP is defined
    if (typeof gsap !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    } else {
        console.warn("GSAP is not defined. ScrollTrigger animations will not function.");
    }
    
    gsap.to(loadingScreen, { opacity: 1, duration: 1, delay: 0.5 });
    activateButton.addEventListener('click', async () => {
        await Tone.start(); // Ensure audio context is started on user gesture
        gsap.to(loadingScreen, { opacity: 0, duration: 1, onComplete: () => {
            loadingScreen.style.display = 'none';
            mainContent.style.pointerEvents = 'all';
            gsap.to(mainContent, { opacity: 1, duration: 1, delay: 0.5, onComplete: () => {
                startAmbientSound();
                startStormEffect(); // Start storm effects when main content is active
                initVantaBirds("main"); // Initialize Vanta Birds for homepage
            }});
            generateSynapticLines();
        }});
    });

    // --- Page Navigation ---
    dataCores.forEach(core => {
        core.addEventListener('click', () => {
            const targetPageId = core.dataset.page;
            showPage(targetPageId);
            dataCores.forEach(c => c.classList.remove('active'));
            core.classList.add('active');
        });
    });
    returnButtons.forEach(button => {
        button.addEventListener('click', () => {
            showPage('main-content');
            dataCores.forEach(core => core.classList.remove('active'));
        });
    });
    function showPage(pageId) {
        // Fade out current page/main content
        const currentPageElement = activePage ? document.getElementById(activePage + '-page') : mainContent;

        gsap.to(currentPageElement, {
            opacity: 0, duration: 0.5, onComplete: () => {
                // Hide all pages
                pages.forEach(p => p.classList.remove('active'));
                mainContent.style.pointerEvents = 'none'; // Disable interaction with main content when a page is open

                // Stop any ongoing animations/effects specific to the outgoing page
                if (threeJSAnimator) {
                    cancelAnimationFrame(threeJSAnimator); // Stop Three.js animation loop
                    threeJSAnimator = null;
                }
                // Destroy Vanta effects if navigating away from their respective pages
                if (vantaEffectMain && activePage === 'main-content') {
                    vantaEffectMain.destroy();
                    vantaEffectMain = null;
                }
                if (vantaEffectPage2 && activePage === 'image-hover') {
                    vantaEffectPage2.destroy();
                    vantaEffectPage2 = null;
                }

                if (window.scrollTextTrigger) {
                    window.scrollTextTrigger.kill();
                    window.scrollTextTrigger = null;
                    scalingText.style.fontSize = '1em'; // Reset font size
                    scrollTextPage.scrollTop = 0; // Reset scroll position
                }
                // Stop main page specific effects if navigating away from main-content
                if (activePage === 'main-content' || !activePage) { // If currently on main-content or first load
                    stopAmbientSound();
                    stopStormEffect();
                }


                if (pageId === 'main-content') {
                    mainContent.style.pointerEvents = 'all'; // Re-enable interaction
                    gsap.to(mainContent, { opacity: 1, duration: 0.5, onComplete: () => {
                        startAmbientSound(); // Restart ambient sound
                        startStormEffect(); // Restart storm effects
                        initVantaBirds("main"); // Re-initialize Vanta Birds when returning to homepage
                    }});
                    // Re-generate synaptic lines as they are children of main-content
                    document.querySelectorAll('.synaptic-line').forEach(line => line.remove());
                    generateSynapticLines();
                } else {
                    const targetPage = document.getElementById(pageId + '-page');
                    if (targetPage) {
                        targetPage.classList.add('active'); // Make the target page visible (visibility: visible)
                        gsap.to(targetPage, { opacity: 1, duration: 0.5, onStart: () => {
                            // Start effects specific to the incoming page
                            if (pageId === 'mystery-element') { initThreeJS(); }
                            if (pageId === 'scroll-text') { initScrollTextScaling(); }
                            if (pageId === 'image-hover') { initVantaBirds("page2"); } // Initialize Vanta Birds for Page 2
                        }});
                    }
                }
                activePage = pageId;
            }
        });
    }

    // Initialize Vanta Birds effect
    function initVantaBirds(target) {
        // Ensure VANTA is defined before trying to use it
        if (typeof VANTA === 'undefined' || typeof VANTA.BIRDS === 'undefined') {
            console.warn("VANTA.js or VANTA.BIRDS is not defined. Vanta effects will not function.");
            return;
        }

        if (target === "main") {
            if (vantaEffectMain) vantaEffectMain.destroy(); // Destroy existing instance if any
            vantaEffectMain = VANTA.BIRDS({
                el: "#vanta-birds", // Points to the element in main-content
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                backgroundColor: 0x10101a, /* Dark background for Vanta */
                color1: 0xff00ff, /* Magenta */
                color2: 0x00ffff, /* Cyan */
                birdSize: 1.50,
                wingSpan: 20.00,
                speedLimit: 4.00,
                separation: 50.00,
                alignment: 50.00,
                cohesion: 50.00,
                quantity: 3.00 /* Fewer birds for subtlety on homepage */
            });
        } else if (target === "page2") {
            if (vantaEffectPage2) vantaEffectPage2.destroy(); // Destroy existing instance if any
            vantaEffectPage2 = VANTA.BIRDS({
                el: "#vanta-birds-page2", // Points to the element in image-hover-page
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                backgroundColor: 0x10101a, /* Dark background for Vanta */
                color1: 0xff00ff, /* Magenta */
                color2: 0x00ffff, /* Cyan */
                birdSize: 1.50,
                wingSpan: 20.00,
                speedLimit: 4.00,
                separation: 50.00,
                alignment: 50.00,
                cohesion: 50.00,
                quantity: 15.00 /* MORE birds for page 2 */
            });
        }
    }

    // --- Synaptic Line Generation ---
    function generateSynapticLines() {
        // Clear existing lines to prevent duplicates on resize
        document.querySelectorAll('.synaptic-line').forEach(line => line.remove());

        const corePositions = {};
        dataCores.forEach(core => {
            const rect = core.getBoundingClientRect();
            // Positions relative to mainContent to keep them in its coordinate system
            const mainRect = mainContent.getBoundingClientRect();
            corePositions[core.id] = {
                x: rect.left + rect.width / 2 - mainRect.left,
                y: rect.top + rect.height / 2 - mainRect.top
            };
        });
        const connections = [
            ['core-hyper-nexus', 'core-emotions'],
            ['core-hyper-nexus', 'core-image-hover'],
            ['core-hyper-nexus', 'core-scroll-text'],
            ['core-hyper-nexus', 'core-mystery'],
            ['core-emotions', 'core-image-hover'],
            ['core-scroll-text', 'core-mystery']
        ];
        connections.forEach(conn => {
            const [startCoreId, endCoreId] = conn;
            const startPos = corePositions[startCoreId];
            const endPos = corePositions[endCoreId];
            if (!startPos || !endPos) return;
            const dx = endPos.x - startPos.x;
            const dy = endPos.y - startPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const line = document.createElement('div');
            line.classList.add('synaptic-line');
            line.style.width = `${distance}px`;
            line.style.left = `${startPos.x}px`;
            line.style.top = `${startPos.y}px`;
            line.style.transform = `rotate(${angle}deg)`;
            mainContent.appendChild(line);
        });
    }
    window.addEventListener('resize', () => {
        // Re-generate lines on resize for responsiveness if on main content
        if (activePage === 'main-content' || !activePage) {
            generateSynapticLines();
        }
        // Also update Three.js canvas size if it's active
        if (activePage === 'mystery-element' && window.threeJSResizeHandler) {
            window.threeJSResizeHandler();
        }
        // Update Vanta birds if active
        if (vantaEffectMain) {
            vantaEffectMain.resize();
        }
        if (vantaEffectPage2) {
            vantaEffectPage2.resize();
        }
    });

    // --- Element 9: Scroll-based Text Scaling Logic ---
    function initScrollTextScaling() {
        // Ensure a previous scroll trigger is killed if it exists and GSAP is defined
        if (typeof ScrollTrigger !== 'undefined' && window.scrollTextTrigger) {
            window.scrollTextTrigger.kill();
        } else if (typeof ScrollTrigger === 'undefined') {
            console.warn("ScrollTrigger is not defined. Scroll-based text scaling will not function.");
            return;
        }
        scrollTextPage.scrollTop = 0; // Reset scroll position on page entry
        window.scrollTextTrigger = ScrollTrigger.create({
            trigger: ".scroll-text-section",
            scroller: "#scroll-text-page", // Important: specify the scroller element
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: self => {
                const scaleValue = 1 + self.progress * 1.5; // Scale from 1 to 2.5
                scalingText.style.fontSize = `${scaleValue}em`;
            }
        });
    }

    // --- AI Chat Logic (using Gemini API) ---
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const userQuery = chatInput.value.trim();
        if (userQuery === '') return;
        appendLog(`[USER]: ${userQuery}`);
        chatInput.value = '';
        processAIQuery(userQuery);
    });
    async function processAIQuery(query) {
        aiResponse.textContent = '';
        processingIndicator.classList.add('active');
        aiResponse.classList.add('processing');

        // In a real application, you would manage chat history more robustly.
        // For this example, we'll just send the current query.
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: query }] });
        const payload = { contents: chatHistory };
        const apiKey = "YOUR_GEMINI_API_KEY_HERE"; // IMPORTANT: Replace with your actual Gemini API Key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                typeWriterEffect(aiResponse, text, () => {
                    processingIndicator.classList.remove('active');
                    aiResponse.classList.remove('processing');
                    appendLog("[AI_RESPONSE]: Query processed successfully.");
                });
            } else if (result.error) {
                throw new Error(`API Error: ${result.error.message}`);
            }
            else {
                throw new Error("Invalid API response format.");
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            typeWriterEffect(aiResponse, `ERROR: Unable to connect to the NeuroStream AI Core. Detail: ${error.message}. Please check system integrity and your API key.`, () => {
                processingIndicator.classList.remove('active');
                aiResponse.classList.remove('processing');
                appendLog("[AI_RESPONSE]: API call failed.", 'critical');
            });
        }
    }
    function typeWriterEffect(element, text, callback) {
        let i = 0;
        element.textContent = '';
        const speed = 30;
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                if (callback) callback();
            }
        }
        type();
    }
    function appendLog(message, type = '') {
        const logEntry = document.createElement('div');
        logEntry.classList.add('log-entry');
        if (type === 'critical') {
            logEntry.classList.add('critical');
        }
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        systemLogs.prepend(logEntry);
        while (systemLogs.children.length > 20) {
            systemLogs.removeChild(systemLogs.lastChild);
        }
    }

    // --- Element 10: Three.js Mystery Element ---
    function initThreeJS() {
        // Ensure THREE is defined before trying to use it
        if (typeof THREE === 'undefined') {
            console.warn("THREE.js is not defined. Mystery element will not function.");
            return;
        }

        const canvas = document.getElementById('mystery-element-canvas');
        let scene, camera, renderer, earth;
        let mouseX = 0, mouseY = 0;
        let windowHalfX = canvas.clientWidth / 2; // Use canvas dimensions
        let windowHalfY = canvas.clientHeight / 2; // Use canvas dimensions

        const boomReverb = new Tone.Reverb(1.5).toDestination();
        mysteryBoomSynth.connect(boomReverb);

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050510);
        scene.fog = new THREE.FogExp2(0x050510, 0.001);

        camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.z = 15;

        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(canvas.clientWidth, canvas.clientHeight); // Set size based on canvas parent

        const earthGeometry = new THREE.SphereGeometry(4, 64, 64);
        const earthTexture = new THREE.MeshPhongMaterial({
            color: 0x1a66ff,
            specular: 0x333333,
            shininess: 5,
            transparent: true,
            opacity: 0.9,
            wireframe: false
        });

        earth = new THREE.Mesh(earthGeometry, earthTexture);
        earth.position.z = -20;
        scene.add(earth);

        const cloudGeometry = new THREE.SphereGeometry(4.1, 64, 64);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2
        });
        const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        earth.add(clouds);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 10);
        scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const particleCount = 1200;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const color = new THREE.Color();

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

            color.setHSL(
                Math.random(),
                0.9,
                Math.random() * 0.4 + 0.6
            );
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = 0.3 + Math.random() * 0.7;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.5,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleSystem);

        let targetX = 0;
        let targetY = 0;
        const mouseInfluence = 0.3;
        const mouseRadius = 70;
        let lastBoomTime = 0;
        let particlesPassed = 0;

        // Event listener for mouse movement specifically on the canvas or its parent
        canvas.addEventListener('mousemove', (e) => {
            // Calculate mouse position relative to the canvas
            const rect = canvas.getBoundingClientRect();
            mouseX = ((e.clientX - rect.left) / rect.width * 2 - 1) * 0.0005 * (window.innerWidth / canvas.clientWidth); // Adjust for different viewport/canvas sizes
            mouseY = (-((e.clientY - rect.top) / rect.height * 2 - 1)) * 0.0005 * (window.innerHeight / canvas.clientHeight); // Adjust for different viewport/canvas sizes

            targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            targetY = -((e.clientY - rect.top) / canvas.height) * 2 + 1;
        });


        const particleSpeed = 0.3;

        function animate() {
            if (activePage === 'mystery-element') { // Only animate if on the correct page
                threeJSAnimator = requestAnimationFrame(animate);

                earth.rotation.y += 0.0015;
                clouds.rotation.y += 0.002;

                camera.position.x += (mouseX * 10 - camera.position.x) * 0.01;
                camera.position.y += (-mouseY * 10 - camera.position.y) * 0.01;
                camera.lookAt(scene.position);

                const particlePositions = particleGeometry.attributes.position.array;
                const particleColors = particleGeometry.attributes.color.array;

                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;

                    particlePositions[i3 + 2] += particleSpeed;

                    if (particlePositions[i3 + 2] > camera.position.z) { // Use camera Z to determine if passed
                        const now = Date.now();
                        particlesPassed++;
                        if (now - lastBoomTime > 100 && particlesPassed > 5) {
                            mysteryBoomSynth.triggerAttackRelease("A3", "16n"); // Use the Tone.Synth for sound
                            lastBoomTime = now;
                            particlesPassed = 0;
                        }

                        particlePositions[i3] = (Math.random() - 0.5) * 100;
                        particlePositions[i3 + 1] = (Math.random() - 0.5) * 100;
                        particlePositions[i3 + 2] = -100;

                        color.setHSL(
                            Math.random(),
                            0.9,
                            Math.random() * 0.4 + 0.6
                        );
                        particleColors[i3] = color.r;
                        particleColors[i3 + 1] = color.g;
                        particleColors[i3 + 2] = color.b;
                    }

                    const dx = particlePositions[i3] - (targetX * 50);
                    const dy = particlePositions[i3 + 1] - (targetY * 50);
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < mouseRadius) {
                        const force = (mouseRadius - distance) / mouseRadius;
                        const angle = Math.atan2(dy, dx);

                        particlePositions[i3] += Math.cos(angle) * force * mouseInfluence * 8;
                        particlePositions[i3 + 1] += Math.sin(angle) * force * mouseInfluence * 8;
                    }
                }

                particleGeometry.attributes.position.needsUpdate = true;
                particleGeometry.attributes.color.needsUpdate = true;

                renderer.render(scene, camera);
            }
        }

        // Resize handler for Three.js
        window.threeJSResizeHandler = () => {
            const parent = canvas.parentElement;
            const width = parent.clientWidth;
            const height = parent.clientHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            windowHalfX = width / 2;
            windowHalfY = height / 2;
        };
        window.addEventListener('resize', window.threeJSResizeHandler, false);
        window.threeJSResizeHandler(); // Initial call to set size

        animate(); // Start the animation loop
    }
});
