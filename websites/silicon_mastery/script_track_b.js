// =============================================================
// SILICON MASTERY: TRACK B INTERACTIVE ENGINE & SCENE CONTROLLER
// =============================================================

document.addEventListener('DOMContentLoaded', () => {
    let currentScene = 1;
    const totalScenes = 12;

    const scenes = document.querySelectorAll('.scene');
    const dotsContainer = document.getElementById('scene-dots');
    const actBadgeDisp = document.getElementById('act-badge');
    const hudSceneTitle = document.getElementById('hud-scene-title');
    const btnPrev = document.getElementById('btn-prev-b');
    const btnNext = document.getElementById('btn-next-b');

    const sceneTitles = [
        "Phase 1.5: The Tensor Memory Illusion (Storage & Strides)",
        "Phase 1.5: Zero-Copy Transposition (t.T)",
        "Phase 1.5: Contiguous vs Non-Contiguous Views & .view()",
        "Phase 1.6: CUDA Programming Model & GPU Architecture",
        "Phase 1.6: Coalesced vs Uncoalesced GPU Memory Access",
        "Phase 1.7: Autograd Tape & Scalar Value Object Anatomy",
        "Phase 1.7: Dynamic Computational Graph Construction",
        "Phase 1.7: Reverse-Mode Autograd & Topological DFS Sort",
        "Phase 1.8: The Baby Operations Calculus Catalog",
        "Phase 1.8: Vector Calculus & Jacobian Matrices",
        "Phase 1.8: Bicycle Gear Chain Rule & Matmul Gradient",
        "Phase 1.8: The Full Micrograd Engine Laboratory"
    ];

    // Generate Navigation Dots
    for (let i = 1; i <= totalScenes; i++) {
        let dot = document.createElement('div');
        dot.className = `scene-dot ${i === 1 ? 'active' : ''}`;
        dot.title = sceneTitles[i - 1];
        dot.onclick = () => goToScene(i);
        dotsContainer.appendChild(dot);
    }

    function goToScene(sceneNo) {
        if (sceneNo < 1 || sceneNo > totalScenes) return;
        currentScene = sceneNo;
        updateScene();
    }

    function updateScene() {
        scenes.forEach((s, idx) => {
            const sceneNo = idx + 1;
            if (sceneNo === currentScene) {
                s.classList.add('active');
                const act = s.getAttribute('data-act') || 'TRACK B';
                actBadgeDisp.innerText = act;
                initSceneInteraction(currentScene);
            } else {
                s.classList.remove('active');
            }
        });

        hudSceneTitle.innerText = sceneTitles[currentScene - 1] || "";
        btnPrev.disabled = (currentScene === 1);
        btnNext.disabled = (currentScene === totalScenes);

        const dots = document.querySelectorAll('.scene-dot');
        dots.forEach((d, idx) => {
            if (idx + 1 === currentScene) d.classList.add('active');
            else d.classList.remove('active');
        });
    }

    btnNext.addEventListener('click', () => { if (currentScene < totalScenes) { currentScene++; updateScene(); } });
    btnPrev.addEventListener('click', () => { if (currentScene > 1) { currentScene--; updateScene(); } });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if ((e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K') && currentScene < totalScenes) {
            currentScene++; updateScene();
        } else if ((e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') && currentScene > 1) {
            currentScene--; updateScene();
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
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalBackdrop = document.querySelector('.modal-backdrop');

    const deepDiveTextB = {
        'content-b1': {
            title: 'Phase 1.5: The 1D Memory Strip vs Coordinate Glasses',
            html: `<h3>What is a Tensor REALLY in Hardware?</h3>
            <p>Physical RAM is strictly 1-dimensional. A Tensor object in PyTorch is simply a pair of coordinate glasses wrapping a 1D storage array.</p>
            <pre><code>linear_address = offset + (row * stride[0]) + (col * stride[1])</code></pre>
            <p>When you reshape or transpose a tensor, PyTorch never moves bytes in RAM. It simply updates the shape and stride metadata in nanoseconds.</p>`
        },
        'content-b2': {
            title: 'Phase 1.5: Zero-Copy Transposition Mechanics',
            html: `<h3>Why t.T Takes 0.000001 Seconds</h3>
            <p>Calling <code>.T</code> or <code>.transpose()</code> in PyTorch swaps the stride values in metadata. Both the original and transposed tensor share the exact same <code>storage.data_ptr()</code> pointer.</p>`
        },
        'content-b3': {
            title: 'Phase 1.5: Contiguity Guards & Memory Reallocation',
            html: `<h3>Why .view() Fails on Transposed Tensors</h3>
            <p><code>.view()</code> requires contiguous memory order. When a tensor is transposed, adjacent elements in coordinate space are no longer adjacent in physical RAM. Calling <code>.contiguous()</code> allocates a new buffer and re-orders the bytes.</p>`
        },
        'content-b4': {
            title: 'Phase 1.6: CUDA SIMT & Streaming Multiprocessors',
            html: `<h3>GPU Execution Model</h3>
            <p>An NVIDIA GPU executes code via SIMT (Single Instruction Multiple Threads). Threads are grouped into 32-thread <strong>Warps</strong> that execute the exact same instruction in parallel lockstep.</p>`
        },
        'content-b5': {
            title: 'Phase 1.6: Memory Coalescing & VRAM Bandwidth',
            html: `<h3>The 97% Bandwidth Drop</h3>
            <p>When a Warp's 32 threads access contiguous 128-byte aligned memory addresses, the memory controller fetches all data in 1 single transaction. Strided non-contiguous accesses force 32 separate transactions!</p>`
        },
        'content-b6': {
            title: 'Phase 1.7: Scalar Value Object Decomposition',
            html: `<h3>Anatomy of an Autograd Node</h3>
            <p>Every scalar in micrograd stores <code>data</code>, <code>grad</code>, <code>_prev</code> (parent nodes), <code>_op</code>, and a <code>_backward()</code> closure implementing the local chain rule derivative.</p>`
        },
        'content-b7': {
            title: 'Phase 1.7: Dynamic Computational Graph (DAG)',
            html: `<h3>Tape-Based Graph Construction</h3>
            <p>PyTorch builds graphs dynamically at runtime ("Define-by-Run"). As Python executes operations, operand relationships are recorded on the tape graph.</p>`
        },
        'content-b8': {
            title: 'Phase 1.7: Topological DFS Sort & Gradient Accumulation',
            html: `<h3>Why We Need Topological Order</h3>
            <p>Topological sorting via DFS post-order guarantees parent gradients are fully evaluated before child backprop runs. Gradients accumulate with <code>+=</code> to prevent overwriting multi-branch derivatives.</p>`
        },
        'content-b9': {
            title: 'Phase 1.8: Baby Operations Calculus Catalog',
            html: `<h3>First-Principles Derivatives</h3>
            <p>Addition distributes gradients 1:1. Multiplication swaps inputs (<code>d(a*b)/da = b</code>). Power rule: <code>d(xⁿ)/dx = n * xⁿ⁻¹</code>. ReLU passes gradient if input > 0.</p>`
        },
        'content-b10': {
            title: 'Phase 1.8: Vector Calculus & Jacobian Matrices',
            html: `<h3>The Jacobian Matrix</h3>
            <p>The Jacobian J ∈ ℝ^(M×N) organizes all partial derivatives ∂yᵢ/∂xⱼ for vector-valued functions.</p>`
        },
        'content-b11': {
            title: 'Phase 1.8: Chain Rule & Matmul Gradient',
            html: `<h3>Matrix Derivative Derivation</h3>
            <p>For Y = X · W, the weight gradient is ∂L/∂W = Xᵀ · ∂L/∂Y. The transposed input matrix maps output loss gradients back to weight updates.</p>`
        },
        'content-b12': {
            title: 'Phase 1.8: Full Micrograd Laboratory Engine',
            html: `<h3>Live Micrograd Backprop</h3>
            <p>Inspect the complete forward pass and backward pass execution flow on a 2-input neuron with hyperbolic tangent activation.</p>`
        }
    };

    document.querySelectorAll('.deep-dive-btn').forEach(btn => {
        btn.onclick = () => {
            const target = btn.getAttribute('data-target');
            const data = deepDiveTextB[target];
            if (data) {
                modalTitle.innerText = data.title;
                modalBody.innerHTML = data.html;
                modal.classList.remove('hidden');
            }
        };
    });

    if (closeModalBtn) closeModalBtn.onclick = () => modal.classList.add('hidden');
    if (modalBackdrop) modalBackdrop.onclick = () => modal.classList.add('hidden');

    // --- INTERACTIVE SCENE CONTROLLER ---
    function initSceneInteraction(sceneIdx) {

        // SCENE 1: TENSOR MEMORY ILLUSION
        if (sceneIdx === 1) {
            const selShape = document.getElementById('sel-shape');
            const stridesVal = document.getElementById('strides-val');
            const gridContainer = document.getElementById('tb-grid-2d');
            const ramRow = document.getElementById('tb-ram-cells');

            function renderTensorView() {
                const shape = selShape.value;
                gridContainer.innerHTML = '';
                let rows = 2, cols = 3, stride0 = 3, stride1 = 1;

                if (shape === '3x2') { rows = 3; cols = 2; stride0 = 2; stride1 = 1; }
                else if (shape === '6x1') { rows = 6; cols = 1; stride0 = 1; stride1 = 1; }

                stridesVal.innerText = `(${stride0}, ${stride1})`;
                gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

                const sampleData = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0];

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        let linearIdx = r * stride0 + c * stride1;
                        let cell = document.createElement('div');
                        cell.className = 'grid-cell';
                        cell.innerHTML = `<span class="c-coord">(${r}, ${c})</span><span class="c-val">${sampleData[linearIdx]}</span>`;

                        cell.onmouseenter = () => {
                            const ramCells = ramRow.querySelectorAll('.ram-cell');
                            ramCells.forEach(rc => rc.classList.remove('highlight'));
                            if (ramCells[linearIdx]) ramCells[linearIdx].classList.add('highlight');
                        };

                        gridContainer.appendChild(cell);
                    }
                }
            }

            if (selShape) selShape.onchange = renderTensorView;
            renderTensorView();
        }

        // SCENE 2: ZERO-COPY TRANSPOSITION
        if (sceneIdx === 2) {
            const gridOrig = document.getElementById('grid-orig');
            const gridTrans = document.getElementById('grid-trans');

            function renderTransposeGrids() {
                gridOrig.style.gridTemplateColumns = 'repeat(3, 1fr)';
                gridTrans.style.gridTemplateColumns = 'repeat(2, 1fr)';
                gridOrig.innerHTML = '';
                gridTrans.innerHTML = '';

                const data = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0];

                // Orig (2x3), strides (3, 1)
                for (let i = 0; i < 6; i++) {
                    let c = document.createElement('div');
                    c.className = 'grid-cell';
                    c.innerText = data[i];
                    gridOrig.appendChild(c);
                }

                // Transposed (3x2), strides (1, 3) -> Order: [10, 40], [20, 50], [30, 60]
                const transOrder = [0, 3, 1, 4, 2, 5];
                transOrder.forEach(idx => {
                    let c = document.createElement('div');
                    c.className = 'grid-cell';
                    c.innerText = data[idx];
                    gridTrans.appendChild(c);
                });
            }

            renderTransposeGrids();

            const btnTrans = document.getElementById('btn-trigger-transpose');
            if (btnTrans) {
                btnTrans.onclick = () => {
                    gsap.fromTo('#grid-trans .grid-cell', { scale: 0 }, { scale: 1, duration: 0.4, stagger: 0.05, ease: "back.out" });
                };
            }
        }

        // SCENE 3: CONTIGUOUS VS NON-CONTIGUOUS
        if (sceneIdx === 3) {
            const btnView = document.getElementById('btn-try-view');
            const btnContig = document.getElementById('btn-fix-contiguous');
            const errText = document.getElementById('err-code-text');
            const reallocBox = document.getElementById('ram-realloc');

            if (btnView) {
                btnView.onclick = () => {
                    errText.style.display = 'block';
                    reallocBox.style.display = 'none';
                    gsap.from(errText, { x: -10, duration: 0.1, repeat: 3, yoyo: true });
                };
            }

            if (btnContig) {
                btnContig.onclick = () => {
                    errText.style.display = 'none';
                    reallocBox.style.display = 'block';
                    gsap.from('#realloc-cells .ram-cell', { scale: 0, duration: 0.4, stagger: 0.05 });
                };
            }
        }

        // SCENE 4: CUDA GPU ARCHITECTURE
        if (sceneIdx === 4) {
            const tGrid = document.getElementById('threads-grid');
            if (tGrid && tGrid.children.length === 0) {
                for (let i = 0; i < 32; i++) {
                    let tc = document.createElement('div');
                    tc.className = 't-cell';
                    tc.innerText = `T${i}`;
                    tGrid.appendChild(tc);
                }
            }

            const btnExec = document.getElementById('btn-exec-kernel');
            if (btnExec) {
                btnExec.onclick = () => {
                    const threads = tGrid.querySelectorAll('.t-cell');
                    gsap.timeline()
                        .to(threads, { className: 't-cell active', duration: 0.3, stagger: 0.02 })
                        .to('.pipe-particle', { opacity: 1, x: 280, duration: 1, repeat: 2, ease: "linear" })
                        .to(threads, { className: 't-cell', duration: 0.3 });
                };
            }
        }

        // SCENE 5: COALESCED VS UNCOALESCED MEMORY
        if (sceneIdx === 5) {
            const btnCoal = document.getElementById('btn-mode-coal');
            const btnUncoal = document.getElementById('btn-mode-uncoal');
            const count = document.getElementById('tm-count');
            const bytes = document.getElementById('tm-bytes');
            const bw = document.getElementById('tm-bw');

            if (btnCoal) {
                btnCoal.onclick = () => {
                    btnCoal.classList.add('active');
                    btnUncoal.classList.remove('active');
                    count.innerText = '1 Transaction';
                    bytes.innerText = '128 Bytes';
                    bw.innerText = '100% (3,350 GB/s)';
                    bw.style.color = '#2E7D4E';
                };
            }

            if (btnUncoal) {
                btnUncoal.onclick = () => {
                    btnUncoal.classList.add('active');
                    btnCoal.classList.remove('active');
                    count.innerText = '32 Transactions';
                    bytes.innerText = '4,096 Bytes';
                    bw.innerText = '3.1% (104 GB/s - 97% DROP!)';
                    bw.style.color = '#C93B3B';
                };
            }
        }

        // SCENE 7: FORWARD GRAPH DAG
        if (sceneIdx === 7) {
            const cv = document.getElementById('forward-dag-b');
            const btn = document.getElementById('btn-build-dag-b');

            function buildForwardDAG() {
                if (!cv) return;
                cv.innerHTML = '';
                const nodes = [
                    { id: 'nb-a', l: 'a=2.0', x: 60, y: 40 },
                    { id: 'nb-b', l: 'b=3.0', x: 60, y: 180 },
                    { id: 'nb-c', l: 'c=4.0', x: 300, y: 180 },
                    { id: 'nb-prod', l: 'a*b = 6.0', x: 300, y: 40 },
                    { id: 'nb-sum', l: 'a*b+c = 10.0', x: 520, y: 110 },
                    { id: 'nb-loss', l: 'L = 100.0', x: 740, y: 110 }
                ];

                nodes.forEach(n => {
                    let el = document.createElement('div');
                    el.className = 'math-node';
                    el.id = n.id;
                    el.innerText = n.l;
                    el.style.left = n.x + 'px';
                    el.style.top = n.y + 'px';
                    cv.appendChild(el);
                });

                setTimeout(() => {
                    drawDagEdges(cv, [
                        ['nb-a', 'nb-prod'],
                        ['nb-b', 'nb-prod'],
                        ['nb-prod', 'nb-sum'],
                        ['nb-c', 'nb-sum'],
                        ['nb-sum', 'nb-loss']
                    ]);
                }, 50);
            }

            if (btn) btn.onclick = buildForwardDAG;
            buildForwardDAG();
        }

        // SCENE 8: TOPOLOGICAL SORT DFS
        if (sceneIdx === 8) {
            const cv = document.getElementById('topo-dag-b');
            const timeline = document.getElementById('tb-topo-timeline');
            const stackText = document.getElementById('tb-stack-text');
            const visitedText = document.getElementById('tb-visited-text');
            const orderText = document.getElementById('tb-order-text');

            function buildTopoCanvas() {
                if (!cv) return;
                cv.innerHTML = '';
                const nodes = [
                    { id: 'tb-x', l: 'x = 2.0\n(Branch x+x)', x: 60, y: 35 },
                    { id: 'tb-y', l: 'y = x + x\n(Data: 4.0)', x: 340, y: 35 },
                    { id: 'tb-loss', l: 'Loss = y * 3\n(Data: 12.0)', x: 610, y: 35 }
                ];

                nodes.forEach(n => {
                    let el = document.createElement('div');
                    el.className = 'math-node';
                    el.id = n.id;
                    el.innerText = n.l;
                    el.style.left = n.x + 'px';
                    el.style.top = n.y + 'px';
                    cv.appendChild(el);
                });

                setTimeout(() => {
                    drawDagEdges(cv, [
                        ['tb-x', 'tb-y'],
                        ['tb-y', 'tb-loss']
                    ]);
                }, 50);
            }

            buildTopoCanvas();

            const btnWrong = document.getElementById('btn-tb-wrong');
            if (btnWrong) {
                btnWrong.onclick = () => {
                    if (!cv.querySelector('.math-node')) buildTopoCanvas();
                    const nx = document.getElementById('tb-x');
                    if (nx) {
                        nx.className = 'math-node node-error';
                        nx.innerText = 'x = 2.0\nx.grad = 3 (OVERWRITTEN!)';
                    }
                    if (stackText) stackText.innerText = 'N/A (No DFS)';
                    if (visitedText) visitedText.innerText = 'Unordered';
                    if (orderText) { orderText.innerText = '[x ➔ y ➔ Loss] (WRONG)'; orderText.style.color = '#C93B3B'; }
                };
            }

            const btnRight = document.getElementById('btn-tb-right');
            if (btnRight) {
                btnRight.onclick = () => {
                    if (!cv.querySelector('.math-node')) buildTopoCanvas();
                    const nx = document.getElementById('tb-x');
                    const ny = document.getElementById('tb-y');
                    const nloss = document.getElementById('tb-loss');

                    const tl = gsap.timeline();
                    tl.to({}, {
                        duration: 0.4,
                        onStart: () => {
                            if (stackText) stackText.innerText = '[Loss, y, x]';
                            if (visitedText) visitedText.innerText = '{Loss, y, x}';
                            if (orderText) { orderText.innerText = '[Loss ➔ y ➔ x]'; orderText.className = 'mon-val highlight'; }
                        }
                    }).to([nloss, ny, nx], {
                        duration: 0.5,
                        onStart: () => {
                            if (nx) { nx.className = 'math-node node-success'; nx.innerText = 'x = 2.0\nx.grad += 3 + 3 = 6.0'; }
                            if (ny) { ny.className = 'math-node node-success'; ny.innerText = 'y = 4.0\ny.grad = 3.0'; }
                            if (nloss) { nloss.className = 'math-node node-success'; nloss.innerText = 'Loss = 12.0\nLoss.grad = 1.0'; }
                        }
                    });
                };
            }
        }

        // SCENE 9: OPS CATALOG
        if (sceneIdx === 9) {
            const detailBox = document.getElementById('op-detail-box');
            const opCards = document.querySelectorAll('.op-card');

            const opInfo = {
                'add': `<h3>Addition (+) Derivative</h3><p>out = a + b ➔ d(out)/da = 1.0, d(out)/db = 1.0. Gradients distribute 1:1 to both inputs.</p>`,
                'mul': `<h3>Multiplication (*) Derivative</h3><p>out = a * b ➔ d(out)/da = b, d(out)/db = a. Gradients swap input multipliers!</p>`,
                'pow': `<h3>Power Rule (xⁿ) Derivative</h3><p>out = xⁿ ➔ d(out)/dx = n * xⁿ⁻¹. Proof: lim (h->0) [(x+h)ⁿ - xⁿ]/h = n * xⁿ⁻¹.</p>`,
                'relu': `<h3>ReLU Activation Derivative</h3><p>out = max(0, x) ➔ d(out)/dx = 1.0 if x > 0 else 0.0.</p>`
            };

            opCards.forEach(card => {
                card.onclick = () => {
                    opCards.forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    const opKey = card.getAttribute('data-op');
                    if (detailBox && opInfo[opKey]) {
                        detailBox.innerHTML = opInfo[opKey];
                    }
                };
            });
        }

        // SCENE 10: JACOBIAN
        if (sceneIdx === 10) {
            const display = document.getElementById('j-matrix-display');
            const btn = document.getElementById('btn-calc-jacobian');

            if (btn && display) {
                btn.onclick = () => {
                    display.innerHTML = `
                        <div style="color:#2E7D4E; font-weight:800; margin-bottom:0.5rem;">Jacobian Matrix J computed for y1 = 2x1 + 3x2, y2 = x1*x2:</div>
                        <code>J = [[ ∂y1/∂x1=2.0, ∂y1/∂x2=3.0 ], [ ∂y2/∂x1=x2, ∂y2/∂x2=x1 ]]</code>
                    `;
                };
            }
        }

        // SCENE 11: BICYCLE GEAR CHAIN RULE
        if (sceneIdx === 11) {
            const btn = document.getElementById('btn-spin-gears');
            if (btn) {
                btn.onclick = () => {
                    gsap.to('#gear-a', { rotation: 360, duration: 1 });
                    gsap.to('#gear-b', { rotation: 720, duration: 1 });
                    gsap.to('#gear-c', { rotation: 2160, duration: 1 });
                };
            }
        }

        // SCENE 12: MICROGRAD LAB
        if (sceneIdx === 12) {
            const btnRun = document.getElementById('btn-run-lab');
            if (btnRun) {
                btnRun.onclick = () => {
                    const x1 = parseFloat(document.getElementById('inp-x1').value) || 2.0;
                    const w1 = parseFloat(document.getElementById('inp-w1').value) || -3.0;
                    const x2 = parseFloat(document.getElementById('inp-x2').value) || 1.0;
                    const w2 = parseFloat(document.getElementById('inp-w2').value) || 1.0;
                    const b = parseFloat(document.getElementById('inp-b').value) || 6.88137;

                    const n = x1 * w1 + x2 * w2 + b;
                    const o = Math.tanh(n);

                    // Derivatives: do/dn = 1 - tanh(n)^2
                    const dodn = 1.0 - (o * o);
                    const w1grad = x1 * dodn;
                    const w2grad = x2 * dodn;

                    document.getElementById('res-n').innerText = n.toFixed(4);
                    document.getElementById('res-o').innerText = o.toFixed(4);
                    document.getElementById('res-w1grad').innerText = w1grad.toFixed(4);
                    document.getElementById('res-w2grad').innerText = w2grad.toFixed(4);
                };
            }
        }

    }

    // SVG DAG LINE RENDERER
    function drawDagEdges(container, connections) {
        let svg = container.querySelector('svg.dag-svg-canvas');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'dag-svg-canvas');
            svg.style.position = 'absolute';
            svg.style.top = '0'; svg.style.left = '0';
            svg.style.width = '100%'; svg.style.height = '100%';
            svg.style.pointerEvents = 'none'; svg.style.zIndex = '1';
            container.prepend(svg);
        }
        svg.innerHTML = '';

        connections.forEach((conn) => {
            const id1 = conn[0];
            const id2 = conn[1];
            const isDouble = (id1 === 'tb-x' && id2 === 'tb-y');

            const el1 = document.getElementById(id1);
            const el2 = document.getElementById(id2);
            if (!el1 || !el2) return;

            const x1 = el1.offsetLeft + (el1.offsetWidth / 2);
            const y1 = el1.offsetTop + (el1.offsetHeight / 2);
            const x2 = el2.offsetLeft + (el2.offsetWidth / 2);
            const y2 = el2.offsetTop + (el2.offsetHeight / 2);

            if (isDouble) {
                const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const cx = (x1 + x2) / 2;

                path1.setAttribute('d', `M ${x1} ${y1} Q ${cx} ${y1 - 35} ${x2} ${y2}`);
                path1.setAttribute('stroke', '#1A1D20');
                path1.setAttribute('stroke-width', '3');
                path1.setAttribute('fill', 'none');

                path2.setAttribute('d', `M ${x1} ${y1} Q ${cx} ${y1 + 35} ${x2} ${y2}`);
                path2.setAttribute('stroke', '#1A1D20');
                path2.setAttribute('stroke-width', '3');
                path2.setAttribute('fill', 'none');

                svg.appendChild(path1);
                svg.appendChild(path2);
            } else {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1); line.setAttribute('y1', y1);
                line.setAttribute('x2', x2); line.setAttribute('y2', y2);
                line.setAttribute('stroke', '#1A1D20'); line.setAttribute('stroke-width', '3');
                line.setAttribute('stroke-linecap', 'round');
                svg.appendChild(line);
            }
        });
    }

    updateScene();
});
