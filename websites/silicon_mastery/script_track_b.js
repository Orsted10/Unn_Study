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

        if (window.renderMathInElement) {
            setTimeout(() => {
                renderMathInElement(document.body, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ]
                });
            }, 50);
        }

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
            html: `<h3>1. Physical RAM & Hardware Storage</h3>
            <p>Computer RAM and GPU VRAM are strictly 1-dimensional flat strips of byte addresses. A 2D or 3D tensor is an illusion created by Shape & Stride metadata wrapping a 1D storage allocation.</p>
            <h4>Linear Address Formula</h4>
            <div class="math-block">$$\text{Linear Address} = \text{Offset} + \sum_{d=0}^{k-1} (i_d \times \text{stride}[d])$$</div>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ Python Execution Simulator (<code>tensor_memory_and_strides.py</code>)</div>
                <pre class="sim-code"><code>storage = Storage([10.0, 20.0, 30.0, 40.0, 50.0, 60.0])
t = RawTensor(storage, shape=(2, 3), strides=(3, 1), offset=0)
# Lookup coordinate (row, col):</code></pre>
                <div class="sim-inputs">
                    <label>Row Index ($i_0$): <input type="number" id="sim-row" value="1" min="0" max="1"></label>
                    <label>Col Index ($i_1$): <input type="number" id="sim-col" value="2" min="0" max="2"></label>
                    <button class="sim-run-btn" id="btn-run-sim-1">▶ RUN CODE</button>
                </div>
                <div class="sim-output" id="sim-out-1">
                    <span class="sim-prompt">>>> t.get_linear_index((1, 2))</span><br>
                    <span class="sim-res">Linear Address: offset(0) + (1 * 3) + (2 * 1) = <strong>5</strong></span><br>
                    <span class="sim-val">RAM Memory Cell [0x14]: <strong>60.0</strong></span>
                </div>
            </div>

            <h4>Python Implementation from <code>tensor_memory_and_strides.py</code></h4>
            <pre><code>class Storage:
    def __init__(self, data: Sequence[float]) -> None:
        # Physical 1D flat allocation
        self._data: List[float] = [float(x) for x in data]

    def __getitem__(self, idx: int) -> float:
        return self._data[idx]

class RawTensor:
    def get_linear_index(self, indices: Tuple[int, ...]) -> int:
        idx = self.storage_offset
        for i, coord in enumerate(indices):
            idx += coord * self.strides[i]
        return idx</code></pre>`
        },
        'content-b2': {
            title: 'Phase 1.5: Zero-Copy Transposition Mechanics',
            html: `<h3>1. Why PyTorch Transpose takes 0.000001 Seconds</h3>
            <p>Transposing a tensor does NOT move or copy any bytes in memory. It simply swaps the <code>strides</code> metadata tuple while keeping the exact same <code>storage.data_ptr()</code> pointer.</p>
            <div class="math-block">$$\text{Original: Shape } (2, 3), \text{ Strides } (3, 1) \implies \text{Transposed: Shape } (3, 2), \text{ Strides } (1, 3)$$</div>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ Python Execution Simulator (<code>t.T Transpose</code>)</div>
                <pre class="sim-code"><code>t = RawTensor(data=[10, 20, 30, 40, 50, 60], shape=(2, 3))
t_trans = t.T  # Swaps strides (3, 1) -> (1, 3)</code></pre>
                <div class="sim-inputs">
                    <button class="sim-run-btn" id="btn-run-sim-2">▶ EXECUTE t.T TRANSPOSE</button>
                </div>
                <div class="sim-output" id="sim-out-2">
                    <span class="sim-prompt">>>> t_trans.storage.data_ptr() == t.storage.data_ptr()</span><br>
                    <span class="sim-res">True (Zero Bytes Allocated!)</span><br>
                    <span class="sim-val">Strides: (1, 3) | Shape: (3, 2)</span>
                </div>
            </div>

            <h4>Python Implementation</h4>
            <pre><code>def transpose(self) -> RawTensor:
    # Zero-copy metadata swap!
    new_shape = (self.shape[1], self.shape[0])
    new_strides = (self.strides[1], self.strides[0])
    return RawTensor(
        storage=self.storage, # Shares same physical memory!
        shape=new_shape,
        strides=new_strides,
        storage_offset=self.storage_offset
    )</code></pre>`
        },
        'content-b3': {
            title: 'Phase 1.5: Contiguity Guards & Memory Reallocation',
            html: `<h3>1. Why .view() Fails on Transposed Tensors</h3>
            <p><code>.view()</code> demands contiguous row-major memory where elements in coordinate space are adjacent in physical RAM. When transposed, adjacent row elements jump by stride steps in RAM, causing <code>RuntimeError</code>.</p>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ Python Execution Simulator (<code>.view() vs .contiguous()</code>)</div>
                <pre class="sim-code"><code>t_trans = t.T  # Transposed non-contiguous tensor</code></pre>
                <div class="sim-inputs">
                    <button class="sim-run-btn red-btn" id="btn-run-sim-3a">▶ RUN t_trans.view(6)</button>
                    <button class="sim-run-btn green-btn" id="btn-run-sim-3b">▶ RUN t_trans.contiguous().view(6)</button>
                </div>
                <div class="sim-output" id="sim-out-3">
                    <span class="sim-prompt">>>> Select an operation above</span>
                </div>
            </div>

            <h4>Memory Reallocation via .contiguous()</h4>
            <pre><code>def is_contiguous(self) -> bool:
    expected_stride = 1
    for d in reversed(range(len(self.shape))):
        if self.shape[d] != 1 and self.strides[d] != expected_stride:
            return False
        expected_stride *= self.shape[d]
    return True

def contiguous(self) -> RawTensor:
    if self.is_contiguous(): return self
    # Reallocates flat 1D memory in logical order
    new_data = [self[r, c] for r in range(self.shape[0]) for c in range(self.shape[1])]
    return RawTensor.from_list(new_data, self.shape)</code></pre>`
        },
        'content-b4': {
            title: 'Phase 1.6: CUDA SIMT & Streaming Multiprocessors',
            html: `<h3>1. NVIDIA GPU Architecture & Warps</h3>
            <p>GPUs execute massive parallel workloads using SIMT (Single Instruction Multiple Threads). Threads are grouped into 32-thread <strong>Warps</strong> that execute the exact same instruction in lockstep across CUDA cores inside a Streaming Multiprocessor (SM).</p>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ CUDA Kernel Warp Execution Simulator</div>
                <pre class="sim-code"><code>__global__ void add_kernel(float* A, float* B, float* C) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < N) C[idx] = A[idx] + B[idx];
}</code></pre>
                <div class="sim-inputs">
                    <label>Grid Threads ($N$): <input type="number" id="sim-cuda-threads" value="128" min="32" max="1024" step="32"></label>
                    <button class="sim-run-btn" id="btn-run-sim-4">▶ LAUNCH CUDA KERNEL</button>
                </div>
                <div class="sim-output" id="sim-out-4">
                    <span class="sim-prompt">>>> nvcc kernel execution...</span><br>
                    <span class="sim-res">Active Warps: <strong>4 Warps (128 CUDA Threads)</strong></span><br>
                    <span class="sim-val">Execution Mode: Lockstep SIMT across 4 SM Warp Schedulers</span>
                </div>
            </div>

            <h4>Warp Execution Pipeline</h4>
            <ul>
                <li><strong>Warp Scheduler</strong>: Dispatches instructions to 32 parallel CUDA cores.</li>
                <li><strong>Shared Memory</strong>: Low-latency L1 cache shared within an SM block.</li>
                <li><strong>Thread Divergence Penalty</strong>: If threads in a warp branch conditionally (<code>if/else</code>), execution serializes!</li>
            </ul>`
        },
        'content-b5': {
            title: 'Phase 1.6: Memory Coalescing & VRAM Bandwidth',
            html: `<h3>1. The 97% Bandwidth Penalty</h3>
            <p>GPU memory controllers fetch VRAM data in 128-byte aligned transactions. If 32 threads in a warp access consecutive addresses, all 32 numbers arrive in <strong>1 single memory transaction</strong> (Coalesced access).</p>

            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ VRAM Memory Controller Simulator</div>
                <div class="sim-inputs">
                    <button class="sim-run-btn green-btn" id="btn-run-sim-5a">▶ TEST COALESCED ACCESS</button>
                    <button class="sim-run-btn red-btn" id="btn-run-sim-5b">▶ TEST STRIDED UNCOALESCED ACCESS</button>
                </div>
                <div class="sim-output" id="sim-out-5">
                    <span class="sim-prompt">>>> Select access mode to benchmark VRAM bus transactions...</span>
                </div>
            </div>`
        },
        'content-b6': {
            title: 'Phase 1.7: Scalar Value Object Decomposition',
            html: `<h3>1. Anatomy of an Autograd Node</h3>
            <p>The <code>Value</code> class in <code>autograd_engine_from_scratch.py</code> stores the forward pass result, the derivative accumulator, and a closure that executes the local chain rule derivative.</p>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ Value Node Instantiate & Backward Simulator</div>
                <pre class="sim-code"><code>a = Value(2.0)
b = Value(3.0)
c = a * b  # c.data = 6.0</code></pre>
                <div class="sim-inputs">
                    <label>Set $a.data$: <input type="number" id="sim-val-a" value="2.0" step="0.5"></label>
                    <label>Set $b.data$: <input type="number" id="sim-val-b" value="3.0" step="0.5"></label>
                    <button class="sim-run-btn" id="btn-run-sim-6">▶ EVALUATE FORWARD & BACKWARD</button>
                </div>
                <div class="sim-output" id="sim-out-6">
                    <span class="sim-prompt">>>> c = a * b; c.backward()</span><br>
                    <span class="sim-res">c.data = <strong>6.0</strong> | c.grad = <strong>1.0</strong></span><br>
                    <span class="sim-val">a.grad = d(a*b)/da * c.grad = b.data = <strong>3.0</strong></span><br>
                    <span class="sim-val">b.grad = d(a*b)/db * c.grad = a.data = <strong>2.0</strong></span>
                </div>
            </div>

            <pre><code>class Value:
    def __init__(self, data: float, _children=(), _op=""):
        self.data: float = float(data)
        self.grad: float = 0.0
        self._backward: Callable[[], None] = lambda: None
        self._prev: Set[Value] = set(_children)
        self._op: str = _op</code></pre>`
        },
        'content-b7': {
            title: 'Phase 1.7: Dynamic Computational Graph (DAG)',
            html: `<h3>1. Define-by-Run Tape Construction</h3>
            <p>As Python evaluates expressions, overloaded operators (<code>+</code>, <code>*</code>, <code>**</code>) construct a Directed Acyclic Graph (DAG) on the fly, recording child-parent relationships.</p>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ Expression Tape Recorder Simulator</div>
                <pre class="sim-code"><code>L = (a * b + c) ** 2</code></pre>
                <div class="sim-inputs">
                    <button class="sim-run-btn" id="btn-run-sim-7">▶ RECORD DAG TAPE</button>
                </div>
                <div class="sim-output" id="sim-out-7">
                    <span class="sim-prompt">>>> Building DAG Nodes...</span><br>
                    <span class="sim-res">Tape Nodes: [a, b, (a*b), c, (a*b + c), L]</span><br>
                    <span class="sim-val">Edges: 5 Directed Edges Wired in Graph Memory</span>
                </div>
            </div>`
        },
        'content-b8': {
            title: 'Phase 1.7: Topological DFS Sort & Gradient Accumulation',
            html: `<h3>1. Preventing Gradient Overwriting via Post-Order DFS</h3>
            <p>If a variable is reused in multiple branches, backpropagation MUST process all child nodes before calculating parent gradients. DFS post-order topological sort ensures perfect evaluation order.</p>
            <div class="math-block">$$\text{Multivariate Chain Rule: } \frac{\partial L}{\partial x} = \sum_{j \in \text{children}(x)} \frac{\partial L}{\partial y_j} \frac{\partial y_j}{\partial x}$$</div>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ DFS Topological Sort Simulator</div>
                <pre class="sim-code"><code># Graph: f = x * x (x is reused!)</code></pre>
                <div class="sim-inputs">
                    <button class="sim-run-btn" id="btn-run-sim-8">▶ EXECUTE DFS TOPOLOGICAL SORT</button>
                </div>
                <div class="sim-output" id="sim-out-8">
                    <span class="sim-prompt">>>> topo_sort(f)</span><br>
                    <span class="sim-res">Topological Order: [x, f]</span><br>
                    <span class="sim-val">Reversed Order Backprop: f._backward() -> x.grad += 2 * x.data</span>
                </div>
            </div>`
        },
        'content-b9': {
            title: 'Phase 1.8: Baby Operations Calculus Catalog',
            html: `<h3>1. First-Principles Derivatives Table</h3>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ Derivative Calculator Simulator</div>
                <div class="sim-inputs">
                    <label>Op: <select id="sim-op-sel">
                        <option value="add">Addition (a + b)</option>
                        <option value="mul">Multiplication (a * b)</option>
                        <option value="pow">Power (a ^ 3)</option>
                        <option value="relu">ReLU (max(0, a))</option>
                    </select></label>
                    <label>a: <input type="number" id="sim-op-a" value="2.0" step="0.5"></label>
                    <button class="sim-run-btn" id="btn-run-sim-9">▶ COMPUTE DERIVATIVE</button>
                </div>
                <div class="sim-output" id="sim-out-9">
                    <span class="sim-prompt">>>> Select operator above...</span>
                </div>
            </div>`
        },
        'content-b10': {
            title: 'Phase 1.8: Vector Calculus & Jacobian Matrices',
            html: `<h3>1. The Jacobian Matrix $J \in \mathbb{R}^{M \times N}$</h3>
            <p>For a vector-valued function $f: \mathbb{R}^N \to \mathbb{R}^M$, the Jacobian matrix organizes all first-order partial derivatives:</p>
            <div class="math-block">$$J = \begin{bmatrix} \frac{\partial f_1}{\partial x_1} & \dots & \frac{\partial f_1}{\partial x_n} \\ \vdots & \ddots & \vdots \\ \frac{\partial f_m}{\partial x_1} & \dots & \frac{\partial f_m}{\partial x_n} \end{bmatrix}$$</div>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ 2x2 Jacobian Matrix Evaluator</div>
                <pre class="sim-code"><code>f1(x, y) = x^2 + 3y
f2(x, y) = 2x * y</code></pre>
                <div class="sim-inputs">
                    <label>x: <input type="number" id="sim-j-x" value="2.0" step="0.5"></label>
                    <label>y: <input type="number" id="sim-j-y" value="3.0" step="0.5"></label>
                    <button class="sim-run-btn" id="btn-run-sim-10">▶ COMPUTE JACOBIAN MATRIX</button>
                </div>
                <div class="sim-output" id="sim-out-10">
                    <span class="sim-prompt">>>> Evaluating J at (x=2, y=3)...</span><br>
                    <span class="sim-res">J = [[2x, 3], [2y, 2x]] = <strong>[[4.0, 3.0], [6.0, 4.0]]</strong></span>
                </div>
            </div>`
        },
        'content-b11': {
            title: 'Phase 1.8: Chain Rule & Matmul Gradient',
            html: `<h3>1. Matrix Multiplication Derivatives</h3>
            <p>For matrix product $Y = X \cdot W$ where $X \in \mathbb{R}^{B \times N}$ and $W \in \mathbb{R}^{N \times M}$:</p>
            <div class="math-block">$$\frac{\partial L}{\partial W} = X^T \cdot \frac{\partial L}{\partial Y}, \qquad \frac{\partial L}{\partial X} = \frac{\partial L}{\partial Y} \cdot W^T$$</div>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ Matmul Backprop Tensor Shape Simulator</div>
                <div class="sim-inputs">
                    <label>Batch Size (B): <input type="number" id="sim-mm-b" value="4" min="1"></label>
                    <label>In Dim (N): <input type="number" id="sim-mm-n" value="3" min="1"></label>
                    <label>Out Dim (M): <input type="number" id="sim-mm-m" value="2" min="1"></label>
                    <button class="sim-run-btn" id="btn-run-sim-11">▶ COMPUTE GRADIENT SHAPES</button>
                </div>
                <div class="sim-output" id="sim-out-11">
                    <span class="sim-prompt">>>> Y = X @ W (X:(4,3), W:(3,2) -> Y:(4,2))</span><br>
                    <span class="sim-res">dL/dW = X^T @ dL/dY = (3,4) @ (4,2) -> <strong>Shape (3, 2)</strong></span><br>
                    <span class="sim-val">dL/dX = dL/dY @ W^T = (4,2) @ (2,3) -> <strong>Shape (4, 3)</strong></span>
                </div>
            </div>`
        },
        'content-b12': {
            title: 'Phase 1.8: Full Micrograd Laboratory Engine',
            html: `<h3>1. End-to-End Artificial Neuron Evaluation</h3>
            <p>A 2-input single neuron evaluates $y = \tanh(w_1 x_1 + w_2 x_2 + b)$. Calling <code>y.backward()</code> traverses 7 nodes backward, computing exact derivatives for weights $w_1, w_2$ and bias $b$.</p>
            
            <h4>Interactive Code Simulator</h4>
            <div class="code-sim-box">
                <div class="sim-header">⚡ Full Micrograd Neuron Backprop Simulator</div>
                <div class="sim-inputs">
                    <label>x1: <input type="number" id="sim-neu-x1" value="2.0" step="0.5"></label>
                    <label>x2: <input type="number" id="sim-neu-x2" value="1.0" step="0.5"></label>
                    <button class="sim-run-btn" id="btn-run-sim-12">▶ RUN FULL NEURON BACKPROP</button>
                </div>
                <div class="sim-output" id="sim-out-12">
                    <span class="sim-prompt">>>> y = tanh(w1*x1 + w2*x2 + b); y.backward()</span><br>
                    <span class="sim-res">Forward Output: y = <strong>0.8807</strong></span><br>
                    <span class="sim-val">Gradients: w1.grad = <strong>0.4488</strong> | w2.grad = <strong>0.2244</strong> | b.grad = <strong>0.2244</strong></span>
                </div>
            </div>`
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
                if (window.renderMathInElement) {
                    renderMathInElement(modalBody, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false}
                        ]
                    });
                }

                // Interactive Simulator Wiring
                const btnSim1 = document.getElementById('btn-run-sim-1');
                if (btnSim1) {
                    btnSim1.onclick = () => {
                        const r = parseInt(document.getElementById('sim-row').value) || 0;
                        const c = parseInt(document.getElementById('sim-col').value) || 0;
                        const strides0 = 3, strides1 = 1;
                        const offset = 0;
                        const linearIdx = offset + (r * strides0) + (c * strides1);
                        const ramData = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0];
                        const val = ramData[linearIdx] !== undefined ? ramData[linearIdx] : 0.0;
                        const hexAddr = "0x" + (linearIdx * 4).toString(16).padStart(2, '0').toUpperCase();

                        const simOut = document.getElementById('sim-out-1');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> t.get_linear_index((${r}, ${c}))</span><br>
                                <span class="sim-res">Linear Address: offset(${offset}) + (${r} * ${strides0}) + (${c} * ${strides1}) = <strong>${linearIdx}</strong></span><br>
                                <span class="sim-val">RAM Memory Cell [${hexAddr}]: <strong>${val.toFixed(1)}</strong></span>
                            `;
                        }
                    };
                }

                const btnSim2 = document.getElementById('btn-run-sim-2');
                if (btnSim2) {
                    btnSim2.onclick = () => {
                        const simOut = document.getElementById('sim-out-2');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> t_trans = t.T</span><br>
                                <span class="sim-res">t.strides (3, 1) -> t_trans.strides (1, 3)</span><br>
                                <span class="sim-val">t_trans.storage.data_ptr() == t.storage.data_ptr() -> <strong>True (Zero Copy!)</strong></span>
                            `;
                        }
                    };
                }

                const btnSim3a = document.getElementById('btn-run-sim-3a');
                const btnSim3b = document.getElementById('btn-run-sim-3b');
                if (btnSim3a && btnSim3b) {
                    btnSim3a.onclick = () => {
                        const simOut = document.getElementById('sim-out-3');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> t_trans.view(6)</span><br>
                                <span class="sim-res" style="color:#EF4444;">RuntimeError: view size is not compatible with input tensor's size and stride!</span>
                            `;
                        }
                    };
                    btnSim3b.onclick = () => {
                        const simOut = document.getElementById('sim-out-3');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> t_trans.contiguous().view(6)</span><br>
                                <span class="sim-res">Success! Fresh 1D allocation: [10.0, 40.0, 20.0, 50.0, 30.0, 60.0]</span><br>
                                <span class="sim-val">Strides: (1,) | Contiguous: True</span>
                            `;
                        }
                    };
                }

                const btnSim4 = document.getElementById('btn-run-sim-4');
                if (btnSim4) {
                    btnSim4.onclick = () => {
                        const n = parseInt(document.getElementById('sim-cuda-threads').value) || 128;
                        const warps = Math.ceil(n / 32);
                        const simOut = document.getElementById('sim-out-4');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> Launching add_kernel<<<&lt;${Math.ceil(n/128)}, 128&gt;&gt;&gt;</span><br>
                                <span class="sim-res">Active Warps: <strong>${warps} Warps (${n} CUDA Threads)</strong></span><br>
                                <span class="sim-val">SIMT Lockstep: ${warps} Warp Schedulers active across SM cores</span>
                            `;
                        }
                    };
                }

                const btnSim5a = document.getElementById('btn-run-sim-5a');
                const btnSim5b = document.getElementById('btn-run-sim-5b');
                if (btnSim5a && btnSim5b) {
                    btnSim5a.onclick = () => {
                        const simOut = document.getElementById('sim-out-5');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> Coalesced Access Benchmark</span><br>
                                <span class="sim-res">VRAM Bus Transactions: <strong>1 Transaction (128-byte block)</strong></span><br>
                                <span class="sim-val">VRAM Bandwidth Utilization: <strong>100% (1,008 GB/s throughput)</strong></span>
                            `;
                        }
                    };
                    btnSim5b.onclick = () => {
                        const simOut = document.getElementById('sim-out-5');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> Strided Uncoalesced Access Benchmark</span><br>
                                <span class="sim-res" style="color:#EF4444;">VRAM Bus Transactions: <strong>32 Separate Transactions!</strong></span><br>
                                <span class="sim-val" style="color:#EF4444;">VRAM Bandwidth Drop: <strong>3.1% Utilization (31.5 GB/s penalty!)</strong></span>
                            `;
                        }
                    };
                }

                const btnSim6 = document.getElementById('btn-run-sim-6');
                if (btnSim6) {
                    btnSim6.onclick = () => {
                        const aData = parseFloat(document.getElementById('sim-val-a').value) || 2.0;
                        const bData = parseFloat(document.getElementById('sim-val-b').value) || 3.0;
                        const cData = aData * bData;
                        const aGrad = bData * 1.0;
                        const bGrad = aData * 1.0;

                        const simOut = document.getElementById('sim-out-6');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> c = a * b; c.backward()</span><br>
                                <span class="sim-res">c.data = <strong>${cData.toFixed(2)}</strong> | c.grad = <strong>1.00</strong></span><br>
                                <span class="sim-val">a.grad = d(a*b)/da * c.grad = <strong>${aGrad.toFixed(2)}</strong></span><br>
                                <span class="sim-val">b.grad = d(a*b)/db * c.grad = <strong>${bGrad.toFixed(2)}</strong></span>
                            `;
                        }
                    };
                }

                const btnSim7 = document.getElementById('btn-run-sim-7');
                if (btnSim7) {
                    btnSim7.onclick = () => {
                        const simOut = document.getElementById('sim-out-7');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> L = (a * b + c) ** 2</span><br>
                                <span class="sim-res">Recorded Graph: [a, b] -> (*)-> (a*b), c -> (+)-> (a*b+c) -> (**2)-> L</span><br>
                                <span class="sim-val">Active Tape Nodes: 6 Value Objects in Memory</span>
                            `;
                        }
                    };
                }

                const btnSim8 = document.getElementById('btn-run-sim-8');
                if (btnSim8) {
                    btnSim8.onclick = () => {
                        const simOut = document.getElementById('sim-out-8');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> f = x * x; f.backward()</span><br>
                                <span class="sim-res">Topological Order: [x, f]</span><br>
                                <span class="sim-val">Accumulated Gradient: x.grad += x.data * 1.0 + x.data * 1.0 = <strong>2 * x.data</strong></span>
                            `;
                        }
                    };
                }

                const btnSim9 = document.getElementById('btn-run-sim-9');
                if (btnSim9) {
                    btnSim9.onclick = () => {
                        const op = document.getElementById('sim-op-sel').value;
                        const valA = parseFloat(document.getElementById('sim-op-a').value) || 2.0;
                        let deriv = 1.0, expr = "";

                        if (op === 'add') { deriv = 1.0; expr = `d(a + b)/da = 1.0`; }
                        else if (op === 'mul') { deriv = 3.0; expr = `d(a * 3)/da = 3.0`; }
                        else if (op === 'pow') { deriv = 3 * Math.pow(valA, 2); expr = `d(a^3)/da = 3 * a^2 = 3 * (${valA}^2)`; }
                        else if (op === 'relu') { deriv = valA > 0 ? 1.0 : 0.0; expr = `d(max(0, a))/da = ${valA > 0 ? 1.0 : 0.0}`; }

                        const simOut = document.getElementById('sim-out-9');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> Evaluating derivative for ${op}...</span><br>
                                <span class="sim-res">${expr}</span><br>
                                <span class="sim-val">Computed Local Slope da: <strong>${deriv.toFixed(4)}</strong></span>
                            `;
                        }
                    };
                }

                const btnSim10 = document.getElementById('btn-run-sim-10');
                if (btnSim10) {
                    btnSim10.onclick = () => {
                        const x = parseFloat(document.getElementById('sim-j-x').value) || 2.0;
                        const y = parseFloat(document.getElementById('sim-j-y').value) || 3.0;

                        const j11 = (2 * x).toFixed(1);
                        const j12 = (3.0).toFixed(1);
                        const j21 = (2 * y).toFixed(1);
                        const j22 = (2 * x).toFixed(1);

                        const simOut = document.getElementById('sim-out-10');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> J = [[df1/dx, df1/dy], [df2/dx, df2/dy]]</span><br>
                                <span class="sim-res">Evaluated Jacobian J: <strong>[[${j11}, ${j12}], [${j21}, ${j22}]]</strong></span>
                            `;
                        }
                    };
                }

                const btnSim11 = document.getElementById('btn-run-sim-11');
                if (btnSim11) {
                    btnSim11.onclick = () => {
                        const b = parseInt(document.getElementById('sim-mm-b').value) || 4;
                        const n = parseInt(document.getElementById('sim-mm-n').value) || 3;
                        const m = parseInt(document.getElementById('sim-mm-m').value) || 2;

                        const simOut = document.getElementById('sim-out-11');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> Y = X @ W (X:(${b},${n}), W:(${n},${m}))</span><br>
                                <span class="sim-res">dL/dW = X^T @ dL/dY = (${n},${b}) @ (${b},${m}) -> <strong>Shape (${n}, ${m})</strong></span><br>
                                <span class="sim-val">dL/dX = dL/dY @ W^T = (${b},${m}) @ (${m},${n}) -> <strong>Shape (${b}, ${n})</strong></span>
                            `;
                        }
                    };
                }

                const btnSim12 = document.getElementById('btn-run-sim-12');
                if (btnSim12) {
                    btnSim12.onclick = () => {
                        const x1 = parseFloat(document.getElementById('sim-neu-x1').value) || 2.0;
                        const x2 = parseFloat(document.getElementById('sim-neu-x2').value) || 1.0;
                        const w1 = 0.5, w2 = -0.5, b = 0.8;

                        const rawOutput = (w1 * x1) + (w2 * x2) + b;
                        const actOutput = Math.tanh(rawOutput);
                        const dAct = 1 - (actOutput * actOutput);

                        const dw1 = x1 * dAct;
                        const dw2 = x2 * dAct;
                        const db = 1.0 * dAct;

                        const simOut = document.getElementById('sim-out-12');
                        if (simOut) {
                            simOut.innerHTML = `
                                <span class="sim-prompt">>>> Neuron Forward & Backward Evaluation</span><br>
                                <span class="sim-res">y = tanh(${rawOutput.toFixed(2)}) = <strong>${actOutput.toFixed(4)}</strong></span><br>
                                <span class="sim-val">w1.grad = <strong>${dw1.toFixed(4)}</strong> | w2.grad = <strong>${dw2.toFixed(4)}</strong> | b.grad = <strong>${db.toFixed(4)}</strong></span>
                            `;
                        }
                    };
                }
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
