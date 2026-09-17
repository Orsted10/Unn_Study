document.addEventListener("DOMContentLoaded", () => {
    
    // --- STATE MACHINE LOGIC ---
    let currentScene = 1;
    const totalScenes = 21;
    const scenes = document.querySelectorAll('.scene');
    
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const sceneNumDisp = document.getElementById('current-scene-num');
    const conceptTitleDisp = document.getElementById('nav-concept-title');
    const actBadgeDisp = document.getElementById('act-badge');
    const dotsContainer = document.getElementById('scene-dots');

    const sceneTitles = [
        "Prologue: The Grand Architecture",
        "Act I: How Python Stores Data",
        "Act I: The Pointer Nightmare",
        "Act I: The 8x Memory Bloat Crisis",
        "Act I: RAM is a 1D Street",
        "Act I: The Storage Abstraction",
        "Act I: Strides & Coordinate Glasses",
        "Act I: Zero-Copy Transpose Miracle",
        "Act II: The Training Crisis & Loss",
        "Act II: Baby Operations Catalog",
        "Act II: Decomposing a Value Object",
        "Act II: The Computational DAG",
        "Act II: The Backward Pass",
        "Act II: Topological Sort DFS",
        "Act III: 10,000 Concurrent Users",
        "Act III: Thread-per-User Disaster",
        "Act III: Non-Blocking Sockets",
        "Act III: The Busy-Wait Crisis",
        "Act III: OS Kernel epoll Rescue",
        "Act III: The Async Event Loop Engine",
        "Finale: The Unified Symphony"
    ];

    // Build scene dots in header
    for (let i = 1; i <= totalScenes; i++) {
        const dot = document.createElement('div');
        dot.className = `scene-dot ${i === 1 ? 'active' : ''}`;
        dot.title = `Scene ${i}: ${sceneTitles[i-1]}`;
        dot.addEventListener('click', () => {
            currentScene = i;
            updateScene();
        });
        dotsContainer.appendChild(dot);
    }

    function updateScene() {
        scenes.forEach((s, idx) => {
            const sceneNo = idx + 1;
            if (sceneNo === currentScene) {
                s.classList.add('active');
                const act = s.getAttribute('data-act') || 'PROLOGUE';
                actBadgeDisp.innerText = act;
                initSceneInteraction(currentScene);
            } else {
                s.classList.remove('active');
            }
        });

        // Update HUD & Nav Progress
        sceneNumDisp.innerText = currentScene;
        conceptTitleDisp.innerText = sceneTitles[currentScene - 1] || "";
        btnPrev.disabled = (currentScene === 1);
        btnNext.disabled = (currentScene === totalScenes);

        // Update Dots
        const dots = document.querySelectorAll('.scene-dot');
        dots.forEach((d, idx) => {
            if (idx + 1 === currentScene) d.classList.add('active');
            else d.classList.remove('active');
        });
    }

    btnNext.addEventListener('click', () => { if (currentScene < totalScenes) { currentScene++; updateScene(); } });
    btnPrev.addEventListener('click', () => { if (currentScene > 1) { currentScene--; updateScene(); } });

    // Global Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if ((e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K') && currentScene < totalScenes) {
            currentScene++;
            updateScene();
        } else if ((e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') && currentScene > 1) {
            currentScene--;
            updateScene();
        } else if (e.key === 'd' || e.key === 'D') {
            const activeBtn = document.querySelector('.scene.active .deep-dive-btn');
            if (activeBtn) activeBtn.click();
        } else if (e.key === ' ') {
            e.preventDefault();
            const activeAction = document.querySelector('.scene.active .interaction-btn');
            if (activeAction) activeAction.click();
        }
    });

    // --- DEEP DIVE MODAL SYSTEM ---
    const modal = document.getElementById('deep-dive-modal');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const modalActTag = document.getElementById('modal-act-tag');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalBackdrop = document.querySelector('.modal-backdrop');

    const deepDiveText = {
        'content-1': {
            act: 'PROLOGUE',
            title: 'The Macro Architecture of Modern AI Systems',
            body: `
                <h3>Why Sockets and Tensors Live Side by Side</h3>
                <p>Imagine you build the smartest AI model on Earth. It lives on a GPU server inside a data center in Frankfurt. The user is sitting on a phone in Mumbai.</p>
                <p>When the user sends a prompt, it is converted into electrical network packets, delivered across undersea fiber-optic cables to a <strong>Hardware Network Interface Card (NIC)</strong>. The <strong>Linux OS Kernel (epoll)</strong> catches the packets and wakes up your <strong>Python Async Event Loop</strong>.</p>
                <p>The event loop parses the HTTP request, tokenizes the text into integers, allocates a <strong>RawTensor in GPU Memory</strong>, and triggers billions of matrix multiplications via <strong>Autograd</strong>. The resulting generated tokens are streamed back over WebSockets.</p>
                <div class="modal-callout">
                    If your backend is slow, your AI is useless. If your AI is slow, your backend is useless. They are two halves of the exact same beating heart.
                </div>
            `
        },
        'content-2': {
            act: 'ACT I: DATA & TENSORS',
            title: 'Representing Images as 2D Matrices',
            body: `
                <h3>The Failure of Python Nested Lists</h3>
                <p>A grayscale cat image is just a 2D grid of numbers (0 to 255). A beginner might store this as:</p>
                <pre><code>cat_image = [
    [10.0, 20.0, 30.0],
    [40.0, 50.0, 60.0]
]</code></pre>
                <p>While this syntax looks innocent, top AI labs banned Python nested lists because they introduce catastrophic performance bottlenecks in physical hardware.</p>
            `
        },
        'content-3': {
            act: 'ACT I: DATA & TENSORS',
            title: 'The Pointer Nightmare & L1 Cache Misses',
            body: `
                <h3>Why Python Pointers Destroy Hardware Latency</h3>
                <p>In Python, a <code>list</code> is not a contiguous array of numbers. It is an array of <strong>memory address pointers</strong> pointing to scattered <code>PyFloatObject</code> heap structs!</p>
                <ul>
                    <li>Number <code>10.0</code> is allocated at address <code>0x7FFF1000</code>.</li>
                    <li>Number <code>20.0</code> is allocated at address <code>0x7FFF9420</code> (somewhere completely different!).</li>
                </ul>
                <p>When the CPU core executes matrix multiplication, it cannot fetch contiguous blocks. It stalls on <strong>L1/L2 Cache Misses</strong> (+200ns delay per lookup), slowing computation down by 100x!</p>
            `
        },
        'content-4': {
            act: 'ACT I: DATA & TENSORS',
            title: 'The 8x Memory Bloat Crisis',
            body: `
                <h3>32 Bytes vs 4 Bytes per Number</h3>
                <p>A raw 32-bit float in C takes exactly <strong>4 bytes</strong> of contiguous RAM.</p>
                <p>A Python <code>PyFloatObject</code> contains:</p>
                <ul>
                    <li>8 bytes: Reference Count (Garbage Collection)</li>
                    <li>8 bytes: Type Pointer (*PyFloat_Type)</li>
                    <li>8 bytes: Double Value</li>
                    <li>8 bytes: List Pointer overhead</li>
                </ul>
                <p>That is <strong>32 bytes per number—an 800% waste of RAM!</strong> For a 70-Billion parameter model, storing weights as Python objects would require <strong>2,240 Gigabytes of RAM</strong> instead of 140 GB!</p>
            `
        },
        'content-5': {
            act: 'ACT I: DATA & TENSORS',
            title: 'Hardware Reality: RAM is a 1D Street',
            body: `
                <h3>Physical Memory Contains No Dimensions</h3>
                <p>Physical RAM is a single, flat, continuous sequence of 1D byte addresses. There are no rows, columns, or 3D cubes in silicon hardware.</p>
                <p>To turn a flat 1D memory array into a matrix, we must decouple <strong>Raw Storage Allocation</strong> from <strong>Coordinate View Metadata</strong>.</p>
            `
        },
        'content-6': {
            act: 'ACT I: DATA & TENSORS',
            title: 'The Storage Abstraction',
            body: `
                <h3>class Storage: Pure Memory Allocation</h3>
                <p>The <code>Storage</code> class has only one single responsibility: allocate a flat C-array of raw numbers in contiguous memory. It has zero knowledge of shapes, strides, or dimensions.</p>
                <pre><code>class Storage:
    def __init__(self, size):
        self.c_ptr = allocate_c_float_array(size)
        self.size = size</code></pre>
            `
        },
        'content-7': {
            act: 'ACT I: DATA & TENSORS',
            title: 'Strides: Coordinate Glasses over 1D Storage',
            body: `
                <h3>Translating 2D (row, col) into 1D Index</h3>
                <p>The <code>RawTensor</code> class provides a view over <code>Storage</code> using two metadata fields:</p>
                <ul>
                    <li><strong>Shape</strong>: <code>(2, 3)</code></li>
                    <li><strong>Strides</strong>: How many steps in 1D storage to advance 1 step in a dimension.</li>
                </ul>
                <pre><code>Storage Index = (row * stride_row) + (col * stride_col)</code></pre>
                <p>For shape (2,3), row stride is 3, col stride is 1. Element at (1,2) maps to <code>1*3 + 2*1 = 5</code> in storage!</p>
            `
        },
        'content-8': {
            act: 'ACT I: DATA & TENSORS',
            title: 'Zero-Copy Transpose Miracle',
            body: `
                <h3>Swapping Metadata in O(1) Time</h3>
                <p>When transposing a matrix, a naive implementation allocates a new memory block and copies every element (taking seconds for a 50GB tensor).</p>
                <p>With strides, we <strong>do not touch the memory storage at all</strong>! We simply swap the shape and strides metadata:</p>
                <ul>
                    <li>Original: Shape (2, 3), Strides (3, 1)</li>
                    <li>Transposed: <strong>Shape (3, 2), Strides (1, 3)</strong></li>
                </ul>
                <div class="modal-callout">
                    Time taken: 0.000001 seconds (O(1) constant time). 0 bytes moved in physical RAM!
                </div>
            `
        },
        'content-9': {
            act: 'ACT II: AUTOGRAD',
            title: 'The Training Crisis & Loss Minimization',
            body: `
                <h3>How Neural Networks Learn</h3>
                <p>Given a model prediction <code>P = (x * w) + b</code> and loss <code>L = (P - Target)²</code>, we need the gradient <code>∂L/∂w</code> to update weight <code>w</code> via gradient descent:</p>
                <pre><code>w_new = w - (learning_rate * grad)</code></pre>
                <p>Manual paper derivatives become impossible when models reach millions of parameters across hundreds of layers.</p>
            `
        },
        'content-10': {
            act: 'ACT II: AUTOGRAD',
            title: 'Baby Operations Calculus Catalog',
            body: `
                <h3>Decomposing Complex Equations</h3>
                <p>Every complex neural network function is composed of elementary baby operations:</p>
                <ul>
                    <li>Addition: <code>out = a + b ⟹ ∂out/∂a = 1, ∂out/∂b = 1</code></li>
                    <li>Multiplication: <code>out = a * b ⟹ ∂out/∂a = b, ∂out/∂b = a</code></li>
                    <li>Power: <code>out = xⁿ ⟹ ∂out/∂x = n * xⁿ⁻¹</code></li>
                    <li>ReLU: <code>out = max(0, x) ⟹ ∂out/∂x = 1.0 (if x > 0 else 0)</code></li>
                </ul>
            `
        },
        'content-11': {
            act: 'ACT II: AUTOGRAD',
            title: 'Decomposing a Value Object',
            body: `
                <h3>Automated Tape Recording</h3>
                <p>The <code>Value</code> class wraps raw numbers and stores:</p>
                <ol>
                    <li><code>data</code>: The numerical value (e.g. 15.0)</li>
                    <li><code>grad</code>: Accumulated partial derivative (e.g. dL/dc)</li>
                    <li><code>_prev</code>: Set of parent Value nodes</li>
                    <li><code>_backward()</code>: Local derivative closure executing the chain rule</li>
                </ol>
            `
        },
        'content-12': {
            act: 'ACT II: AUTOGRAD',
            title: 'The Computational Directed Acyclic Graph (DAG)',
            body: `
                <h3>Forward Pass Graph Construction</h3>
                <p>As Python executes mathematical operations on <code>Value</code> instances, the DAG constructs itself dynamically in memory without requiring explicit model declarations.</p>
            `
        },
        'content-13': {
            act: 'ACT II: AUTOGRAD',
            title: 'The Backward Pass: Loss.backward()',
            body: `
                <h3>Reverse-Mode Automatic Differentiation</h3>
                <p>Calling <code>Loss.backward()</code> sets <code>Loss.grad = 1.0</code> and iterates backwards through the computational DAG, calling each node's local <code>_backward()</code> closure to compute all gradients in a single pass.</p>
            `
        },
        'content-14': {
            act: 'ACT II: AUTOGRAD',
            title: 'Topological Sort DFS Post-Order Traversal',
            body: `
                <h3>Preventing Gradient Overwrites in Branching Graphs</h3>
                <p>When a variable branches into multiple paths (e.g., <code>y = x + x; L = y * 3</code>), multivariate calculus dictates that gradients from both paths must accumulate:</p>
                <pre><code>x.grad += branch1_grad + branch2_grad</code></pre>
                <p>A Topological Sort (DFS post-order) guarantees that all children are fully evaluated before parent gradients are finalized.</p>
            `
        },
        'content-15': {
            act: 'ACT III: ASYNC & EPOLL',
            title: 'The C10K Problem: 10,000 Concurrent Connections',
            body: `
                <h3>Handling Massive Scaled Traffic</h3>
                <p>When 10,000 users connect simultaneously to an AI server, synchronous blocking code stalls completely on socket reads, freezing the entire application.</p>
            `
        },
        'content-16': {
            act: 'ACT III: ASYNC & EPOLL',
            title: 'Disaster: Thread Per Connection Model',
            body: `
                <h3>Why Spawning Threads Crashes Servers</h3>
                <p>Allocating one OS thread per connection creates an 8MB stack per thread:</p>
                <pre><code>10,000 threads × 8MB = 80 GB RAM just for stack allocations!</code></pre>
                <p>The Linux OS kernel spends 95% of CPU time context-switching between thread registers, stalling CPU work until the <strong>OOM-Killer</strong> kills the process.</p>
            `
        },
        'content-17': {
            act: 'ACT III: ASYNC & EPOLL',
            title: 'Non-Blocking Sockets: setblocking(False)',
            body: `
                <h3>Zero-Stall I/O Execution</h3>
                <p>Calling <code>sock.setblocking(False)</code> tells the operating system never to freeze thread execution. If no network data is ready, <code>sock.recv()</code> returns immediately with a <code>BlockingIOError (EWOULDBLOCK)</code>.</p>
            `
        },
        'content-18': {
            act: 'ACT III: ASYNC & EPOLL',
            title: 'The Busy-Wait Spin-Loop Crisis',
            body: `
                <h3>Why User-Space Polling Fails</h3>
                <p>Looping continuously in Python checking 10,000 sockets ("Do you have data yet? No...") causes <strong>100% CPU utilization</strong>, wasting electricity and thermal headroom on empty checks.</p>
            `
        },
        'content-19': {
            act: 'ACT III: ASYNC & EPOLL',
            title: 'OS Kernel epoll / kqueue / IOCP Rescue',
            body: `
                <h3>Hardware NIC Electrical Interrupts</h3>
                <p>Instead of spinning, Python makes an <code>epoll_wait()</code> system call. The Linux kernel suspends the CPU thread until hardware NIC interrupts deliver network bytes, waking Python with ONLY the active descriptors in <strong>O(1) time</strong>.</p>
            `
        },
        'content-20': {
            act: 'ACT III: ASYNC & EPOLL',
            title: 'The Asynchronous Event Loop Engine',
            body: `
                <h3>The Infinite Orchestra Conductor</h3>
                <p>An Event Loop runs continuously in a single thread, cycling through:</p>
                <ol>
                    <li>Executing ready coroutine tasks</li>
                    <li>Checking expired timers in a Min-Heap</li>
                    <li>Polling <code>epoll</code> for network traffic</li>
                </ol>
            `
        },
        'content-21': {
            act: 'FINALE',
            title: 'The Unified Symphony of Modern AI Engineering',
            body: `
                <h3>The End-to-End Pipeline</h3>
                <p>Network Socket ➔ epoll Wakeup ➔ Event Loop Coroutine ➔ Tokenizer ➔ RawTensor Storage ➔ Autograd DAG ➔ Streaming Response.</p>
                <div class="modal-callout">
                    Every piece of code in this repository forms an unbroken engineering narrative of modern computing!
                </div>
            `
        }
    };

    document.querySelectorAll('.deep-dive-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetKey = e.target.getAttribute('data-target');
            const data = deepDiveText[targetKey] || {
                act: 'DEEP DIVE',
                title: 'Technical Specification',
                body: '<p>Detailed technical documentation for this module.</p>'
            };

            modalActTag.innerText = data.act;
            modalTitle.innerText = data.title;
            modalBody.innerHTML = data.body;
            modal.classList.remove('hidden');
        });
    });

    const closeModal = () => modal.classList.add('hidden');
    closeModalBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);


    // --- SCENE INTERACTIONS & ANIMATIONS ---

    function initSceneInteraction(sceneIdx) {
        
        // SCENE 1: Pipeline Request
        if (sceneIdx === 1) {
            const dispatchBtn = document.getElementById('btn-dispatch-req');
            const packet = document.getElementById('hero-packet-1');
            const nodes = document.querySelectorAll('.df-node');
            const infoText = document.getElementById('pipeline-info-text');

            nodes.forEach(node => {
                node.onclick = () => {
                    nodes.forEach(n => n.classList.remove('active-node'));
                    node.classList.add('active-node');
                    infoText.innerText = node.getAttribute('data-info');
                };
            });

            dispatchBtn.onclick = () => {
                packet.style.display = 'block';
                const tl = gsap.timeline();
                
                tl.fromTo(packet, { left: '10%' }, { left: '28%', duration: 0.8, ease: "power1.inOut", onStart: () => nodes[0].click() })
                  .to(packet, { left: '48%', duration: 0.8, ease: "power1.inOut", onStart: () => nodes[1].click() })
                  .to(packet, { left: '68%', duration: 0.8, ease: "power1.inOut", onStart: () => nodes[2].click() })
                  .to(packet, { left: '88%', duration: 0.8, ease: "power1.inOut", onStart: () => nodes[3].click() })
                  .to(packet, { left: '95%', opacity: 0, duration: 0.4, onStart: () => nodes[4].click(), onComplete: () => {
                      packet.style.display = 'none';
                      packet.style.opacity = '1';
                  }});
            };
        }

        // SCENE 2: Cat Grid Inspector
        if (sceneIdx === 2) {
            document.querySelectorAll('.cat-pixel').forEach(px => {
                px.onmouseenter = (e) => {
                    const r = px.dataset.row;
                    const c = px.dataset.col;
                    const v = px.dataset.val;
                    const flat = (parseInt(r) * 3) + parseInt(c);

                    document.getElementById('pi-row').innerText = r;
                    document.getElementById('pi-col').innerText = c;
                    document.getElementById('pi-val').innerText = v;
                    document.getElementById('pi-flat').innerText = flat;
                };
            });
        }

        // SCENE 3: Pointer Nightmare
        if (sceneIdx === 3) {
            const btn = document.getElementById('btn-run-cpu');
            const ho = document.getElementById('heap-objects');
            const missCountDisp = document.getElementById('miss-count');
            const latencyDisp = document.getElementById('latency-count');
            let misses = 0;
            let latency = 0;

            if (ho.children.length === 0) {
                const values = ['10.0', '20.0', '30.0', '40.0', '50.0', '60.0'];
                values.forEach((val, i) => {
                    let el = document.createElement('div');
                    el.className = 'heap-obj';
                    el.innerText = `0x7F${Math.floor(Math.random()*90+10)} -> ${val}`;
                    el.style.top = `${(i * 35) + 20}px`;
                    el.style.left = `${(i * 110) + 30}px`;
                    ho.appendChild(el);
                });
            }

            btn.onclick = () => {
                misses = 0;
                latency = 0;
                missCountDisp.innerText = '0';
                latencyDisp.innerText = '0 ns';

                const objs = document.querySelectorAll('.heap-obj');
                const cursor = document.getElementById('cpu-cursor');
                cursor.style.display = 'flex';
                
                const tl = gsap.timeline();
                objs.forEach((obj, i) => {
                    tl.to(cursor, {
                        x: obj.offsetLeft + 10,
                        y: obj.offsetTop + 10,
                        duration: 0.4,
                        ease: "power2.out",
                        onStart: () => {
                            if (i > 0) {
                                misses++;
                                latency += 200;
                                missCountDisp.innerText = misses;
                                latencyDisp.innerText = `${latency} ns`;
                                document.getElementById('cache-miss-flash').classList.remove('hidden');
                                setTimeout(() => document.getElementById('cache-miss-flash').classList.add('hidden'), 250);
                            }
                        }
                    });
                });
            };
        }

        // SCENE 4: Memory Bloat Scale Slider
        if (sceneIdx === 4) {
            const slider = document.getElementById('param-slider');
            const paramVal = document.getElementById('param-val');
            const pyTotal = document.getElementById('bloat-total');
            const cTotal = document.getElementById('c-total');

            function updateBloat() {
                const params = parseInt(slider.value);
                paramVal.innerText = `${params} Billion Parameters`;
                
                const pyRam = params * 32; // 32GB per billion
                const cRam = params * 4;   // 4GB per billion

                pyTotal.innerText = `${pyRam.toLocaleString()} GB`;
                cTotal.innerText = `${cRam.toLocaleString()} GB`;
            }

            slider.oninput = updateBloat;
            updateBloat();
        }

        // SCENE 5: RAM 1D Street
        if (sceneIdx === 5) {
            document.querySelectorAll('#s5-mem-rail .mem-cell').forEach(cell => {
                cell.onclick = () => {
                    const idx = cell.dataset.idx;
                    const addr = `0x${(parseInt(idx)*4).toString(16).toUpperCase().padStart(2, '0')}`;
                    document.getElementById('ram-info-box').innerHTML = `
                        Cell Index <strong>${idx}</strong> | Byte Address: <strong>${addr}</strong> | Value: <strong>${cell.innerText}</strong> (Contiguous 4-byte Float)
                    `;
                };
            });
        }

        // SCENE 6: Storage Abstraction Binding
        if (sceneIdx === 6) {
            const btn = document.getElementById('btn-bind-storage');
            const box = document.getElementById('s6-storage-layer');

            btn.onclick = () => {
                gsap.to(box, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: "back.out(1.7)"
                });
            };
        }

        // SCENE 7: Strides Equation & Vector Lines
        if (sceneIdx === 7) {
            const rSlider = document.getElementById('stride-r');
            const cSlider = document.getElementById('stride-c');
            
            function updateStrides() {
                const r = parseInt(rSlider.value);
                const c = parseInt(cSlider.value);
                
                document.getElementById('val-r').innerText = r;
                document.getElementById('val-c').innerText = c;
                document.getElementById('eq-r').innerText = r;
                document.getElementById('eq-c').innerText = c;
                
                const idx = (r * 3) + (c * 1);
                document.getElementById('eq-res').innerText = idx;

                // Matrix highlight
                document.querySelectorAll('.matrix-view .m-cell').forEach(el => el.style.background = '#F4EFE6');
                const targetMatrixCell = document.getElementById(`mc-${r}-${c}`);
                if (targetMatrixCell) targetMatrixCell.style.background = '#D96B27';

                // Storage highlight
                document.querySelectorAll('#s7-mem-rail .mem-cell').forEach(el => el.style.background = 'white');
                const targetStorageCell = document.querySelector(`.s7-${idx}`);
                if (targetStorageCell) targetStorageCell.style.background = '#D96B27';
            }

            rSlider.oninput = updateStrides;
            cSlider.oninput = updateStrides;
            updateStrides();
        }

        // SCENE 8: Zero-Copy Transpose
        if (sceneIdx === 8) {
            const btnNaive = document.getElementById('btn-naive');
            const btnZero = document.getElementById('btn-zero');
            const metrics = document.getElementById('zc-metrics');
            const shapeDisp = document.getElementById('zc-shape');
            const stridesDisp = document.getElementById('zc-strides');
            const glassCard = document.getElementById('zc-glass');
            const statusBadge = document.getElementById('zc-status');

            btnNaive.onclick = () => {
                metrics.innerText = "COPIED 50 GB ACROSS MEMORY BUS... BANDWIDTH SATURATED! (Time: 4,800 ms)";
                metrics.style.color = "#C93B3B";
                gsap.to("#zc-mem-rail", { x: "random(-8, 8)", duration: 0.05, repeat: 10 });
            };

            btnZero.onclick = () => {
                metrics.innerText = "BYTES MOVED: 0 B | TIME: 0.000001 ms (O(1) METADATA SWAP)";
                metrics.style.color = "#2E7D4E";
                shapeDisp.innerText = "(3, 2)";
                stridesDisp.innerText = "(1, 3)";
                statusBadge.innerText = "TRANSPOSED VIEW";
                
                gsap.fromTo(glassCard, { rotationY: -180 }, { rotationY: 0, duration: 0.6, ease: "back.out" });
            };
        }

        // SCENE 9: Training Crisis & Weight Slider
        if (sceneIdx === 9) {
            const btnBuild = document.getElementById('btn-build-eq');
            const qText = document.getElementById('q-change-w');
            const nudgePanel = document.getElementById('weight-nudge-panel');
            const wSlider = document.getElementById('w-nudge-slider');

            btnBuild.onclick = () => {
                qText.classList.remove('hidden');
                nudgePanel.classList.remove('hidden');
                gsap.from([qText, nudgePanel], { opacity: 0, y: 20, duration: 0.5, stagger: 0.2 });
            };

            wSlider.oninput = () => {
                const w = parseFloat(wSlider.value);
                const x = 2.0;
                const target = 4.0;
                const pred = x * w;
                const loss = Math.pow(pred - target, 2);
                const grad = 2 * (pred - target) * x;

                document.getElementById('w-val').innerText = w.toFixed(1);
                document.getElementById('l-val').innerText = loss.toFixed(2);
                document.getElementById('grad-val').innerText = grad.toFixed(1);
            };
        }

        // SCENE 10: Baby Operations Catalog
        if (sceneIdx === 10) {
            document.querySelectorAll('.op-block').forEach(op => {
                op.onclick = () => {
                    const insp = document.getElementById('op-inspector');
                    insp.classList.remove('hidden');
                    const type = op.dataset.op;

                    if (type === 'add') {
                        document.getElementById('op-title-text').innerText = "ADDITION: out = a + b";
                        document.getElementById('op-deriv-text').innerText = "∂out/∂a = 1.0\n∂out/∂b = 1.0";
                        document.getElementById('op-code-text').innerText = "a.grad += 1.0 * out.grad\nb.grad += 1.0 * out.grad";
                    } else if (type === 'mul') {
                        document.getElementById('op-title-text').innerText = "MULTIPLICATION: out = a * b";
                        document.getElementById('op-deriv-text').innerText = "∂out/∂a = b\n∂out/∂b = a";
                        document.getElementById('op-code-text').innerText = "a.grad += b.data * out.grad\nb.grad += a.data * out.grad";
                    } else if (type === 'pow') {
                        document.getElementById('op-title-text').innerText = "POWER: out = x ** n";
                        document.getElementById('op-deriv-text').innerText = "∂out/∂x = n * (x ** (n - 1))";
                        document.getElementById('op-code-text').innerText = "x.grad += (n * (x.data ** (n - 1))) * out.grad";
                    } else if (type === 'relu') {
                        document.getElementById('op-title-text').innerText = "ACTIVATION: out = ReLU(x)";
                        document.getElementById('op-deriv-text').innerText = "∂out/∂x = 1.0 if x > 0 else 0.0";
                        document.getElementById('op-code-text').innerText = "x.grad += (1.0 if out.data > 0 else 0.0) * out.grad";
                    }
                };
            });
        }

        // SCENE 11: Decomposing a Value
        if (sceneIdx === 11) {
            const btn = document.getElementById('btn-decompose');
            const box = document.getElementById('val-decompose');

            btn.onclick = () => {
                box.classList.remove('hidden');
                gsap.from(box, { scale: 0.7, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
            };
        }

        // SCENE 12: Forward Graph DAG
        if (sceneIdx === 12) {
            const btn = document.getElementById('btn-build-graph');
            const cv = document.getElementById('forward-dag');

            btn.onclick = () => {
                cv.innerHTML = '';
                const nodes = [
                    { id: 'n-a', l: 'a=5.0', x: 80, y: 60, op: 'Leaf', parents: 'None' },
                    { id: 'n-b', l: 'b=3.0', x: 80, y: 180, op: 'Leaf', parents: 'None' },
                    { id: 'n-c', l: 'c=15.0', x: 380, y: 120, op: 'Mul (*)', parents: '(a, b)' },
                    { id: 'n-loss', l: 'Loss=225', x: 620, y: 120, op: 'Pow (**2)', parents: '(c)' }
                ];

                nodes.forEach(n => {
                    let el = document.createElement('div');
                    el.className = 'math-node';
                    el.id = n.id;
                    el.innerText = n.l;
                    el.style.left = n.x + 'px';
                    el.style.top = n.y + 'px';

                    el.onclick = () => {
                        const insp = document.getElementById('node-inspector');
                        insp.classList.remove('hidden');
                        document.getElementById('ni-title').innerText = `Node: ${n.l}`;
                        document.getElementById('ni-data').innerText = `Data: ${n.l.split('=')[1]}`;
                        document.getElementById('ni-parents').innerText = `Parents: ${n.parents}`;
                        document.getElementById('ni-op').innerText = `Operation: ${n.op}`;
                    };

                    cv.appendChild(el);
                    gsap.from(el, { scale: 0, duration: 0.4, ease: "back.out" });
                });

                // Edges
                setTimeout(() => {
                    createEdge(cv, 170, 105, 380, 165);
                    createEdge(cv, 170, 225, 380, 165);
                    createEdge(cv, 470, 165, 620, 165);
                }, 400);
            };
        }

        // Helper for SVG/HTML Edges
        function createEdge(container, x1, y1, x2, y2) {
            const length = Math.hypot(x2 - x1, y2 - y1);
            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

            const edge = document.createElement('div');
            edge.className = 'math-edge';
            edge.style.width = `${length}px`;
            edge.style.left = `${x1}px`;
            edge.style.top = `${y1}px`;
            edge.style.transform = `rotate(${angle}deg)`;
            container.appendChild(edge);
        }

        // SCENE 13: Backward Pass
        if (sceneIdx === 13) {
            const cv = document.getElementById('backward-dag');
            if (cv.innerHTML === '') {
                const fwd = document.getElementById('forward-dag');
                cv.innerHTML = fwd.innerHTML || `<div class="math-node" style="left:620px;top:120px">Loss=225</div><div class="math-node" style="left:380px;top:120px">c=15.0</div><div class="math-node" style="left:80px;top:60px">a=5.0</div><div class="math-node" style="left:80px;top:180px">b=3.0</div>`;
            }

            document.getElementById('btn-run-backward').onclick = () => {
                const nodes = cv.querySelectorAll('.math-node');
                gsap.to(nodes, {
                    borderColor: "#C93B3B",
                    color: "#C93B3B",
                    boxShadow: "0 0 15px rgba(201, 59, 59, 0.4)",
                    duration: 0.6,
                    stagger: { each: 0.5, from: "end" }
                });
            };
        }

        // SCENE 14: Topological Sort
        if (sceneIdx === 14) {
            const timeline = document.getElementById('topo-timeline');
            document.getElementById('btn-topo-wrong').onclick = () => {
                timeline.innerHTML = `
                    <div class="tl-slot" style="background:#FDEDEC; color:#C93B3B">Branch 1: x.grad = 3 (WRONG OVERWRITE)</div>
                `;
            };
            document.getElementById('btn-topo-right').onclick = () => {
                timeline.innerHTML = `
                    <div class="tl-slot" style="background:#E8F8F5; color:#2E7D4E">Eval Loss</div>
                    <div class="tl-slot" style="background:#E8F8F5; color:#2E7D4E">Eval y</div>
                    <div class="tl-slot" style="background:#E8F8F5; color:#2E7D4E">Accumulate x.grad += 3 + 3 = 6</div>
                `;
            };
        }

        // SCENE 15: 10,000 Users Canvas Particles
        if (sceneIdx === 15) {
            const canvas = document.getElementById('user-canvas-15');
            if (canvas) {
                canvas.width = 900;
                canvas.height = 250;
                const ctx = canvas.getContext('2d');
                let particles = [];

                document.getElementById('btn-flood-users').onclick = () => {
                    particles = [];
                    for (let i = 0; i < 300; i++) {
                        particles.push({
                            x: Math.random() * canvas.width,
                            y: Math.random() * canvas.height,
                            vx: (Math.random() - 0.5) * 4,
                            vy: (Math.random() - 0.5) * 4,
                            color: '#D96B27'
                        });
                    }

                    function draw() {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        particles.forEach(p => {
                            p.x += p.vx;
                            p.y += p.vy;
                            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                            ctx.beginPath();
                            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                            ctx.fillStyle = p.color;
                            ctx.fill();
                        });
                        if (currentScene === 15) requestAnimationFrame(draw);
                    }
                    draw();
                };
            }
        }

        // SCENE 16: Thread per user disaster
        if (sceneIdx === 16) {
            document.getElementById('btn-spawn-threads').onclick = () => {
                const pool = document.getElementById('thread-pool');
                pool.innerHTML = '';
                for (let i = 0; i < 600; i++) {
                    let d = document.createElement('div');
                    d.className = 'thread-dot';
                    pool.appendChild(d);
                }

                let stats = { th: 0, ram: 1, ctx: 0 };
                gsap.to(stats, {
                    th: 10000,
                    ram: 80,
                    ctx: 500000,
                    duration: 2.5,
                    onUpdate: () => {
                        document.getElementById('d-th').innerText = Math.floor(stats.th).toLocaleString();
                        document.getElementById('d-ram').innerText = Math.floor(stats.ram);
                        document.getElementById('d-ctx').innerText = Math.floor(stats.ctx).toLocaleString();
                    },
                    onComplete: () => {
                        document.getElementById('oom-alert-16').classList.remove('hidden');
                    }
                });
            };
        }

        // SCENE 18: Busy Wait Spin Loop
        if (sceneIdx === 18) {
            const arr = document.getElementById('bw-sockets');
            if (arr.children.length === 0) {
                for (let i = 1; i <= 24; i++) {
                    let d = document.createElement('div');
                    d.className = 'sock-card';
                    d.innerText = `Sock #${i}`;
                    arr.appendChild(d);
                }
            }

            document.getElementById('btn-busy-wait').onclick = () => {
                const cpu = document.getElementById('bw-cpu');
                const stat = document.getElementById('bw-cpu-stat');
                const loopStat = document.getElementById('bw-loop-stat');

                gsap.to(cpu, { x: 300, duration: 0.5, repeat: 8, yoyo: true });

                let util = { v: 0, l: 0 };
                gsap.to(util, {
                    v: 100,
                    l: 10000000,
                    duration: 2,
                    onUpdate: () => {
                        stat.innerText = Math.floor(util.v);
                        loopStat.innerText = Math.floor(util.l).toLocaleString();
                    }
                });
            };
        }

        // SCENE 19: epoll Hardware IRQ Flow
        if (sceneIdx === 19) {
            document.getElementById('btn-epoll-flow').onclick = () => {
                const tl = gsap.timeline();
                tl.to("#ep-app", { opacity: 0.5, duration: 0.4 })
                  .to("#ep-nic", { background: "#D96B27", color: "white", duration: 0.3, repeat: 3, yoyo: true })
                  .to("#ep-kernel", { background: "#2E7D4E", duration: 0.5 })
                  .to("#ep-app", { opacity: 1, borderColor: "#2E7D4E", duration: 0.4 });
            };
        }

        // SCENE 20: Event Loop Clockwork
        if (sceneIdx === 20) {
            document.getElementById('btn-run-loop').onclick = () => {
                const tl = gsap.timeline({ repeat: -1 });
                tl.to("#lm-ready", { scale: 1.1, background: "#D96B27", color: "white", duration: 0.5 })
                  .to("#lm-ready", { scale: 1, background: "white", color: "#1A1D20", duration: 0.1 })
                  .to("#lm-timer", { scale: 1.1, background: "#D96B27", color: "white", duration: 0.5 })
                  .to("#lm-timer", { scale: 1, background: "white", color: "#1A1D20", duration: 0.1 })
                  .to("#lm-os", { scale: 1.1, background: "#D96B27", color: "white", duration: 0.5 })
                  .to("#lm-os", { scale: 1, background: "white", color: "#1A1D20", duration: 0.1 })
                  .to("#lm-task", { scale: 1.1, background: "#2E7D4E", color: "white", duration: 0.5 })
                  .to("#lm-task", { scale: 1, background: "white", color: "#1A1D20", duration: 0.1 });
            };
        }

        // SCENE 21: Unified Symphony
        if (sceneIdx === 21) {
            document.getElementById('btn-run-unified').onclick = () => {
                const nodes = document.querySelectorAll('.u-node');
                gsap.to(nodes, {
                    background: "#2E7D4E",
                    color: "white",
                    duration: 0.5,
                    stagger: 0.3,
                    onComplete: () => {
                        gsap.to(nodes, { background: "white", color: "#1A1D20", duration: 0.5 });
                    }
                });
            };
        }
    }

    // Initialize initial scene
    updateScene();
});
