// ============================================================
        //  完整核心逻辑 + 走马灯 + 翻页笔控制
        // ============================================================

        (function() {
            'use strict';

            // ---- DOM 引用 ----
            const mainNameEl = document.getElementById('mainName');
            const prevNameText = document.getElementById('prevNameText');
            const nextNameText = document.getElementById('nextNameText');
            const studentCount = document.getElementById('studentCount');
            const importBtn = document.getElementById('importBtn');
            const localBtn = document.getElementById('localBtn');
            const clearBtn = document.getElementById('clearBtn');
            const startBtn = document.getElementById('startBtn');
            const stopBtn = document.getElementById('stopBtn');
            const fileInput = document.getElementById('fileInput');
            const colSelect = document.getElementById('colSelect');
            const themeBtns = document.querySelectorAll('.theme-btn');
            const versionInfo = document.getElementById('versionInfo');
            const copyrightBtn = document.getElementById('copyrightBtn');
            const copyrightModal = document.getElementById('copyrightModal');
            const modalCloseBtn = document.getElementById('modalCloseBtn');
            const marqueeContainer = document.getElementById('marqueeContainer');

            const VERSION = '超级点名器 V1.2';

            function updateVersionInfo() {
                const now = new Date();
                const pad = n => String(n).padStart(2, '0');
                const timestamp =
                    `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
                versionInfo.textContent = `${VERSION} · ${timestamp}`;
            }
            updateVersionInfo();

            // ---- 版权弹窗 ----
            function showModal() { copyrightModal.classList.add('show'); }

            function hideModal() { copyrightModal.classList.remove('show'); }

            copyrightBtn.addEventListener('click', showModal);
            modalCloseBtn.addEventListener('click', hideModal);
            copyrightModal.addEventListener('click', function(e) {
                if (e.target === this) hideModal();
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && copyrightModal.classList.contains('show')) hideModal();
            });

            // ============================================================
            //  走马灯系统
            // ============================================================

            const LIGHT_CONFIGS = {
                neon: {
                    count: 24,
                    size: 26,
                    shape: ['circle', 'square'],
                    shapeRatio: 3,
                    colors: ['#00ffff', '#ff00ff', '#ffff00', '#00ff88', '#ff3366', '#8844ff', '#ff8800', '#33ccff'],
                    glowStyle: 'outer',
                    interval: 70,
                    trail: 3,
                    motion: 'steady',
                    specialEffect: 'scale'
                },
                gradient: {
                    count: 20,
                    size: 24,
                    shape: ['droplet'],
                    shapeRatio: 1,
                    colors: 'hsl',
                    glowStyle: 'rainbow',
                    interval: 120,
                    trail: 2,
                    motion: 'wave',
                    specialEffect: 'droplet'
                },
                memphis: {
                    count: 16,
                    size: 30,
                    shape: ['triangle', 'circle'],
                    shapeRatio: 1,
                    colors: ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF', '#FF9F43', '#2ED573', '#FF4757'],
                    glowStyle: 'shadow',
                    interval: 150,
                    trail: 1,
                    motion: 'jump',
                    specialEffect: 'bounce'
                },
                clay: {
                    count: 20,
                    size: 28,
                    shape: ['circle'],
                    shapeRatio: 1,
                    colors: ['#E8D5B7', '#D4A574', '#C4B7A6', '#A8B5A0', '#DCC8B0', '#B8A99A', '#E0C9B5', '#C9BBA8'],
                    glowStyle: 'inner',
                    interval: 200,
                    trail: 1,
                    motion: 'breath',
                    specialEffect: 'raise'
                }
            };

            let currentTheme = 'neon';
            let lightElements = [];
            let lightColors = [];
            let lightShapes = [];
            let marqueeTimer = null;
            let activeIndex = 0;
            let isMarqueeRunning = false;
            let waveStep = 0;
            let isFlashing = false;
            let flashTimer = null;
            let autoOffTimer = null;
            let isAutoOffPending = false;

            // ---- 形状生成 ----
            function getShapeCSS(shape, size) {
                switch (shape) {
                    case 'circle':
                        return `border-radius: 50%;`;
                    case 'square':
                        return `border-radius: 3px;`;
                    case 'triangle':
                        return `clip-path: polygon(50% 0%, 0% 100%, 100% 100%); border-radius: 0;`;
                    case 'droplet':
                        return `border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;`;
                    default:
                        return `border-radius: 50%;`;
                }
            }

            // ---- 生成灯的位置 ----
            function generateLightPositions(count) {
                const positions = [];
                const perSide = Math.floor(count / 4);
                const remaining = count % 4;

                const topCount = perSide + (remaining >= 1 ? 1 : 0);
                for (let i = 0; i < topCount; i++) {
                    positions.push({ x: (i + 1) / (topCount + 1), y: 0 });
                }

                const rightCount = perSide + (remaining >= 2 ? 1 : 0);
                for (let i = 0; i < rightCount; i++) {
                    positions.push({ x: 1, y: (i + 1) / (rightCount + 1) });
                }

                const bottomCount = perSide + (remaining >= 3 ? 1 : 0);
                for (let i = 0; i < bottomCount; i++) {
                    positions.push({ x: 1 - (i + 1) / (bottomCount + 1), y: 1 });
                }

                const leftCount = perSide;
                for (let i = 0; i < leftCount; i++) {
                    positions.push({ x: 0, y: 1 - (i + 1) / (leftCount + 1) });
                }

                return positions;
            }

            // ---- 生成颜色 ----
            function generateColors(theme, count) {
                const config = LIGHT_CONFIGS[theme];
                if (config.colors === 'hsl') {
                    return Array.from({ length: count }, (_, i) => {
                        const hue = (i / count) * 360 + 30;
                        return `hsl(${hue}, 80%, 65%)`;
                    });
                }
                const colors = [];
                for (let i = 0; i < count; i++) {
                    colors.push(config.colors[i % config.colors.length]);
                }
                return colors;
            }

            // ---- 生成形状列表 ----
            function generateShapes(theme, count) {
                const config = LIGHT_CONFIGS[theme];
                const shapes = [];
                for (let i = 0; i < count; i++) {
                    if (config.shape.length === 1) {
                        shapes.push(config.shape[0]);
                    } else if (config.shapeRatio === 1) {
                        shapes.push(config.shape[i % config.shape.length]);
                    } else {
                        const cycle = config.shapeRatio + 1;
                        const pos = i % cycle;
                        shapes.push(pos < config.shapeRatio ? config.shape[0] : config.shape[1]);
                    }
                }
                return shapes;
            }

            // ---- 构建走马灯 ----
            function buildMarquee(theme) {
                marqueeContainer.innerHTML = '';
                lightElements = [];
                lightColors = [];
                lightShapes = [];

                const config = LIGHT_CONFIGS[theme];
                const count = config.count;
                const size = config.size || 20;
                const positions = generateLightPositions(count);
                const colors = generateColors(theme, count);
                const shapes = generateShapes(theme, count);

                const offset = Math.ceil(size / 2) + 2;

                positions.forEach((pos, i) => {
                    const light = document.createElement('div');
                    light.className = 'light';

                    const left = pos.x * 100;
                    const top = pos.y * 100;

                    light.style.left = `calc(${left}% + ${pos.x === 0 ? offset : pos.x === 1 ? -offset : 0}px)`;
                    light.style.top = `calc(${top}% + ${pos.y === 0 ? offset : pos.y === 1 ? -offset : 0}px)`;
                    light.style.width = size + 'px';
                    light.style.height = size + 'px';

                    const shapeCSS = getShapeCSS(shapes[i], size);
                    light.style.cssText += shapeCSS;

                    const color = colors[i];
                    light.style.backgroundColor = color;

                    applyGlowStyle(light, theme, color, false);

                    light.dataset.index = i;
                    light.dataset.color = color;
                    light.dataset.shape = shapes[i];

                    marqueeContainer.appendChild(light);
                    lightElements.push(light);
                    lightColors.push(color);
                    lightShapes.push(shapes[i]);
                });

                lightElements.forEach((el) => {
                    el.style.opacity = '0.12';
                    el.style.transform = `translate(-50%, -50%) scale(0.8)`;
                });

                activeIndex = 0;
                isFlashing = false;
                isAutoOffPending = false;
                if (flashTimer) {
                    clearInterval(flashTimer);
                    flashTimer = null;
                }
                if (autoOffTimer) {
                    clearTimeout(autoOffTimer);
                    autoOffTimer = null;
                }
            }

            // ---- 应用发光样式 ----
            function applyGlowStyle(el, theme, color, isActive) {
                const config = LIGHT_CONFIGS[theme];
                const glowStyle = config.glowStyle;

                el.style.boxShadow = 'none';
                el.style.border = 'none';
                el.style.filter = 'none';

                if (isActive) {
                    switch (glowStyle) {
                        case 'outer':
                            el.style.boxShadow = `0 0 30px 14px ${color}, 0 0 70px 30px ${color}44`;
                            el.style.filter = 'brightness(1.3)';
                            break;
                        case 'rainbow':
                            const hue = (parseInt(el.dataset.index) * 15) % 360;
                            el.style.boxShadow =
                                `0 0 25px 12px hsl(${hue}, 90%, 70%), 0 0 55px 22px hsl(${hue+40}, 90%, 60%)44`;
                            el.style.filter = 'brightness(1.2)';
                            break;
                        case 'shadow':
                            el.style.boxShadow = `6px 6px 0 #2d2d2d, 0 0 25px ${color}66`;
                            el.style.border = '2px solid #2d2d2d';
                            break;
                        case 'inner':
                            el.style.boxShadow =
                                `inset 0 -6px 0 rgba(0,0,0,0.15), inset 0 4px 14px rgba(255,255,255,0.4), 0 4px 18px rgba(0,0,0,0.08)`;
                            el.style.filter = 'brightness(1.15)';
                            break;
                        default:
                            el.style.boxShadow = `0 0 25px 10px ${color}88`;
                    }
                } else {
                    if (glowStyle === 'inner') {
                        el.style.boxShadow = `inset 0 -4px 0 rgba(0,0,0,0.08), inset 0 2px 8px rgba(255,255,255,0.2)`;
                    } else {
                        el.style.boxShadow = `0 0 10px 3px ${color}22`;
                    }
                }
            }

            // ---- 走马灯更新 ----
            function updateMarquee() {
                if (isFlashing) return;
                const config = LIGHT_CONFIGS[currentTheme];
                const trail = config.trail || 2;
                const count = lightElements.length;
                if (count === 0) return;

                lightElements.forEach((el, i) => {
                    el.classList.remove('active', 'trail', 'trail2');
                    const color = el.dataset.color;
                    applyGlowStyle(el, currentTheme, color, false);
                    el.style.opacity = '0.12';
                    el.style.transform = `translate(-50%, -50%) scale(0.8)`;
                });

                let idx = activeIndex;
                if (config.motion === 'jump') {
                    idx = activeIndex % count;
                } else if (config.motion === 'wave') {
                    waveStep += 0.3;
                    const wavePos = Math.sin(waveStep) * 0.5 + 0.5;
                    idx = Math.floor(wavePos * count) % count;
                }

                for (let i = 0; i < trail; i++) {
                    const targetIdx = (idx - i + count) % count;
                    const el = lightElements[targetIdx];
                    const color = el.dataset.color;

                    if (i === 0) {
                        el.classList.add('active');
                        applyGlowStyle(el, currentTheme, color, true);
                        el.style.opacity = '1';
                        applySpecialEffect(el, currentTheme, 'active');
                    } else if (i === 1) {
                        el.classList.add('trail');
                        applyGlowStyle(el, currentTheme, color, true);
                        el.style.opacity = '0.55';
                        el.style.transform = `translate(-50%, -50%) scale(0.92)`;
                        if (config.glowStyle !== 'inner') {
                            el.style.boxShadow = el.style.boxShadow.replace(/[0-9]+px/g, m => Math.floor(parseInt(m) * 0.5) +
                            'px');
                        }
                    } else if (i === 2) {
                        el.classList.add('trail2');
                        applyGlowStyle(el, currentTheme, color, false);
                        el.style.opacity = '0.25';
                        el.style.transform = `translate(-50%, -50%) scale(0.85)`;
                    }
                }

                if (config.motion === 'breath') {
                    const breathPhase = (Date.now() % 2000) / 2000;
                    const brightness = Math.sin(breathPhase * Math.PI) * 0.6 + 0.4;
                    lightElements.forEach((el, i) => {
                        if (i === idx) {
                            el.style.opacity = brightness.toString();
                            el.style.transform =
                                `translate(-50%, -50%) scale(${0.9 + brightness * 0.15})`;
                            applyGlowStyle(el, currentTheme, el.dataset.color, true);
                            el.style.boxShadow = el.style.boxShadow.replace(/[0-9]+px/g, m => Math.floor(parseInt(m) *
                                brightness) + 'px');
                        }
                    });
                }

                if (config.motion === 'jump') {
                    activeIndex = (activeIndex + 2) % count;
                } else if (config.motion === 'steady' || config.motion === 'wave' || config.motion === 'breath') {
                    activeIndex = (activeIndex + 1) % count;
                }
            }

            // ---- 特殊效果 ----
            function applySpecialEffect(el, theme, state) {
                const config = LIGHT_CONFIGS[theme];
                const effect = config.specialEffect;

                if (state === 'active') {
                    switch (effect) {
                        case 'scale':
                            el.style.transform = `translate(-50%, -50%) scale(1.3)`;
                            break;
                        case 'droplet':
                            el.style.transform = `translate(-50%, -50%) rotate(45deg) scale(1.2)`;
                            break;
                        case 'bounce':
                            el.style.transform = `translate(-50%, -50%) scale(1.15) translateY(-8px)`;
                            break;
                        case 'raise':
                            el.style.transform = `translate(-50%, -50%) scale(1.1)`;
                            break;
                        default:
                            el.style.transform = `translate(-50%, -50%) scale(1.15)`;
                    }
                }
            }

            // ---- 闪烁5次后常亮 ----
            function flashFiveThenStayOn() {
                if (isFlashing) return;
                if (lightElements.length === 0) return;

                isFlashing = true;
                isAutoOffPending = true;

                if (marqueeTimer) {
                    clearInterval(marqueeTimer);
                    marqueeTimer = null;
                }
                isMarqueeRunning = false;

                if (autoOffTimer) {
                    clearTimeout(autoOffTimer);
                    autoOffTimer = null;
                }

                lightElements.forEach((el) => {
                    el.classList.remove('active', 'trail', 'trail2', 'all-on', 'flash-on', 'flash-off');
                });

                let flashCount = 0;
                const totalFlashes = 10;

                if (flashTimer) {
                    clearInterval(flashTimer);
                    flashTimer = null;
                }

                flashTimer = setInterval(() => {
                    if (flashCount >= totalFlashes) {
                        clearInterval(flashTimer);
                        flashTimer = null;
                        lightElements.forEach((el) => {
                            el.classList.remove('flash-off');
                            const color = el.dataset.color;
                            applyGlowStyle(el, currentTheme, color, true);
                            el.style.opacity = '1';
                            el.style.transform = `translate(-50%, -50%) scale(1.15)`;
                            el.classList.add('all-on');
                        });
                        isFlashing = false;

                        if (autoOffTimer) {
                            clearTimeout(autoOffTimer);
                            autoOffTimer = null;
                        }
                        autoOffTimer = setTimeout(() => {
                            if (!isMarqueeRunning && !isFlashing) {
                                lightElements.forEach((el) => {
                                    el.classList.remove('all-on');
                                    const color = el.dataset.color;
                                    applyGlowStyle(el, currentTheme, color, false);
                                    el.style.opacity = '0.12';
                                    el.style.transform = `translate(-50%, -50%) scale(0.8)`;
                                });
                                isAutoOffPending = false;
                                autoOffTimer = null;
                            }
                        }, 3000);

                        return;
                    }

                    const isOn = flashCount % 2 === 0;
                    lightElements.forEach((el) => {
                        const color = el.dataset.color;
                        if (isOn) {
                            el.classList.remove('flash-off');
                            el.classList.add('flash-on');
                            applyGlowStyle(el, currentTheme, color, true);
                            el.style.opacity = '1';
                            el.style.transform = `translate(-50%, -50%) scale(1.2)`;
                        } else {
                            el.classList.remove('flash-on');
                            el.classList.add('flash-off');
                            el.style.boxShadow = 'none';
                            el.style.filter = 'none';
                            el.style.opacity = '0.05';
                            el.style.transform = `translate(-50%, -50%) scale(0.6)`;
                        }
                    });
                    flashCount++;
                }, 150);
            }

            // ---- 启动走马灯 ----
            function startMarquee() {
                if (isMarqueeRunning) return;
                if (lightElements.length === 0) return;

                if (isFlashing) {
                    if (flashTimer) {
                        clearInterval(flashTimer);
                        flashTimer = null;
                    }
                    isFlashing = false;
                }

                if (autoOffTimer) {
                    clearTimeout(autoOffTimer);
                    autoOffTimer = null;
                }
                isAutoOffPending = false;

                lightElements.forEach((el) => {
                    el.classList.remove('all-on', 'flash-on', 'flash-off', 'active', 'trail', 'trail2');
                    const color = el.dataset.color;
                    applyGlowStyle(el, currentTheme, color, false);
                    el.style.opacity = '0.12';
                    el.style.transform = `translate(-50%, -50%) scale(0.8)`;
                });

                isMarqueeRunning = true;
                activeIndex = 0;
                waveStep = 0;

                if (marqueeTimer) {
                    clearInterval(marqueeTimer);
                    marqueeTimer = null;
                }

                const config = LIGHT_CONFIGS[currentTheme];
                const interval = config.interval || 100;

                marqueeTimer = setInterval(() => {
                    updateMarquee();
                }, interval);

                updateMarquee();
            }

            // ---- 停止走马灯 ----
            function stopMarqueeWithFlash() {
                if (isFlashing) return;
                if (isAutoOffPending) return;

                if (marqueeTimer) {
                    clearInterval(marqueeTimer);
                    marqueeTimer = null;
                }
                isMarqueeRunning = false;
                flashFiveThenStayOn();
            }

            // ---- 重置走马灯 ----
            function resetMarquee() {
                if (marqueeTimer) {
                    clearInterval(marqueeTimer);
                    marqueeTimer = null;
                }
                isMarqueeRunning = false;
                isFlashing = false;
                isAutoOffPending = false;
                if (flashTimer) {
                    clearInterval(flashTimer);
                    flashTimer = null;
                }
                if (autoOffTimer) {
                    clearTimeout(autoOffTimer);
                    autoOffTimer = null;
                }

                lightElements.forEach((el) => {
                    el.classList.remove('active', 'trail', 'trail2', 'all-on', 'flash-on', 'flash-off');
                    const color = el.dataset.color;
                    applyGlowStyle(el, currentTheme, color, false);
                    el.style.opacity = '0.12';
                    el.style.transform = `translate(-50%, -50%) scale(0.8)`;
                });
            }

            // ---- 切换主题 ----
            function rebuildMarquee(theme) {
                currentTheme = theme;
                const wasRunning = isMarqueeRunning;
                resetMarquee();
                buildMarquee(theme);
                if (wasRunning) {
                    startMarquee();
                }
            }

            // ---- 窗口自适应 ----
            let resizeTimeout = null;

            function handleResize() {
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                resizeTimeout = setTimeout(() => {
                    const wasRunning = isMarqueeRunning;
                    resetMarquee();
                    const theme = currentTheme;
                    buildMarquee(theme);
                    if (wasRunning) {
                        startMarquee();
                    }
                    resizeTimeout = null;
                }, 300);
            }

            // ============================================================
            //  点名核心逻辑
            // ============================================================

            let rawData = [];
            let headers = [];
            let nameColumn = '';
            let nameList = [];
            let currentIndex = -1;
            let isRolling = false;
            let rollTimer = null;
            let hasData = false;

            function updateStatusBar() {
                studentCount.textContent = (hasData && nameList.length > 0) ? `👥 ${nameList.length} 人` : '👥 未导入';
            }

            function updateDisplay(index) {
                if (!hasData || nameList.length === 0) {
                    mainNameEl.innerHTML = `<span class="hint">📂 导入名单<br>或 📌 加载示例</span>`;
                    prevNameText.textContent = '—';
                    nextNameText.textContent = '—';
                    updateStatusBar();
                    return;
                }
                if (index < 0 || index >= nameList.length) {
                    mainNameEl.textContent = '—';
                    prevNameText.textContent = '—';
                    nextNameText.textContent = '—';
                    updateStatusBar();
                    return;
                }
                const total = nameList.length;
                const prevIdx = (index - 1 + total) % total;
                const nextIdx = (index + 1) % total;
                mainNameEl.textContent = nameList[index];
                prevNameText.textContent = nameList[prevIdx];
                nextNameText.textContent = nameList[nextIdx];
                updateStatusBar();
            }

            function stopRolling() {
                if (rollTimer) { clearInterval(rollTimer);
                    rollTimer = null; }
                isRolling = false;
                startBtn.disabled = false;
                stopBtn.disabled = true;
                stopMarqueeWithFlash();
            }

            function clearAll() {
                stopRolling();
                resetMarquee();
                rawData = [];
                headers = [];
                nameColumn = '';
                nameList = [];
                currentIndex = -1;
                hasData = false;
                colSelect.innerHTML = `<option value="">— 请先导入 —</option>`;
                colSelect.disabled = true;
                mainNameEl.innerHTML = `<span class="hint">📂 导入名单<br>或 📌 加载示例</span>`;
                prevNameText.textContent = '—';
                nextNameText.textContent = '—';
                startBtn.disabled = true;
                stopBtn.disabled = true;
                updateStatusBar();
                localStorage.removeItem('点名器_姓名列表');
                localStorage.removeItem('点名器_列名');
                localStorage.removeItem('点名器_原始数据');
            }

            function restoreFromStorage() {
                const savedNames = localStorage.getItem('点名器_姓名列表');
                const savedColumn = localStorage.getItem('点名器_列名');
                const savedRaw = localStorage.getItem('点名器_原始数据');
                if (savedNames && savedColumn && savedRaw) {
                    try {
                        nameList = JSON.parse(savedNames);
                        nameColumn = savedColumn;
                        rawData = JSON.parse(savedRaw);
                        if (rawData.length > 0 && nameList.length > 0) {
                            headers = Object.keys(rawData[0]);
                            hasData = true;
                            populateColumnSelect();
                            colSelect.value = nameColumn;
                            colSelect.disabled = false;
                            currentIndex = Math.floor(Math.random() * nameList.length);
                            updateDisplay(currentIndex);
                            startBtn.disabled = false;
                            stopBtn.disabled = true;
                            return true;
                        }
                    } catch (e) { console.warn('恢复缓存失败', e); }
                }
                return false;
            }

            function saveToStorage() {
                if (hasData && nameList.length > 0) {
                    localStorage.setItem('点名器_姓名列表', JSON.stringify(nameList));
                    localStorage.setItem('点名器_列名', nameColumn);
                    localStorage.setItem('点名器_原始数据', JSON.stringify(rawData));
                }
            }

            function populateColumnSelect() {
                colSelect.innerHTML = '';
                headers.forEach(h => {
                    const opt = document.createElement('option');
                    opt.value = h;
                    opt.textContent = h;
                    colSelect.appendChild(opt);
                });
                colSelect.disabled = false;
            }

            function updateNameListFromColumn(col) {
                if (!col || !rawData.length) return false;
                const list = rawData.map(row => {
                    const val = row[col];
                    return val !== undefined && val !== null ? String(val).trim() : '';
                }).filter(name => name !== '');
                if (list.length === 0) {
                    alert(`列 "${col}" 中没有有效数据，请选择其他列。`);
                    return false;
                }
                nameList = list;
                nameColumn = col;
                hasData = true;
                currentIndex = Math.floor(Math.random() * nameList.length);
                updateDisplay(currentIndex);
                startBtn.disabled = false;
                stopBtn.disabled = true;
                saveToStorage();
                return true;
            }

            function autoDetectNameColumn() {
                const keywords = ['姓名', '名字', 'name', 'Name', '学生', '学员', '昵称', '全名', 'fullname', 'username', 'user'];
                for (let kw of keywords) {
                    const found = headers.find(h => h.trim() === kw);
                    if (found) return found;
                }
                for (let kw of keywords) {
                    const found = headers.find(h => h.includes(kw) || kw.includes(h));
                    if (found) return found;
                }
                if (headers.length === 1) return headers[0];
                return null;
            }

            // ---- 数据导入 ----
            function processExcelData(json) {
                if (!json || json.length === 0) { alert('数据为空，请检查文件。'); return; }
                clearAll();
                rawData = json;
                headers = Object.keys(json[0]);
                if (headers.length === 0) { alert('无法读取表头。'); return; }
                populateColumnSelect();
                let detected = autoDetectNameColumn();
                if (detected) {
                    colSelect.value = detected;
                    const success = updateNameListFromColumn(detected);
                    if (!success) {
                        mainNameEl.innerHTML = `<span class="hint">👆 请从下拉框选择姓名列</span>`;
                        prevNameText.textContent = '—';
                        nextNameText.textContent = '—';
                        startBtn.disabled = true;
                        stopBtn.disabled = true;
                    }
                } else {
                    mainNameEl.innerHTML = `<span class="hint">👆 请从下拉框选择姓名列</span>`;
                    prevNameText.textContent = '—';
                    nextNameText.textContent = '—';
                    startBtn.disabled = true;
                    stopBtn.disabled = true;
                    if (headers.length > 0) colSelect.value = headers[0];
                }
            }

            function parseWithXLSX(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });
                            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                            resolve(XLSX.utils.sheet_to_json(firstSheet));
                        } catch (err) { reject(err); }
                    };
                    reader.onerror = function() { reject(new Error('文件读取失败')); };
                    reader.readAsArrayBuffer(file);
                });
            }

            async function handleFile(file) {
                try {
                    const json = await parseWithXLSX(file);
                    processExcelData(json);
                } catch (err) {
                    console.warn('文件解析失败:', err);
                    alert('文件解析失败，请确认格式正确。\n支持: .xlsx, .xls, .csv');
                }
            }

            function loadSampleData() {
                const sampleData = [
                    { '序号': 1, '姓名': '张伟', '性别': '男', '成绩': 92 },
                    { '序号': 2, '姓名': '李娜', '性别': '女', '成绩': 88 },
                    { '序号': 3, '姓名': '王强', '性别': '男', '成绩': 95 },
                    { '序号': 4, '姓名': '刘洋', '性别': '女', '成绩': 76 },
                    { '序号': 5, '姓名': '陈静', '性别': '女', '成绩': 89 },
                    { '序号': 6, '姓名': '杨帆', '性别': '男', '成绩': 93 },
                    { '序号': 7, '姓名': '赵敏', '性别': '女', '成绩': 84 },
                    { '序号': 8, '姓名': '黄磊', '性别': '男', '成绩': 90 },
                    { '序号': 9, '姓名': '周婷', '性别': '女', '成绩': 78 },
                    { '序号': 10, '姓名': '吴浩', '性别': '男', '成绩': 96 },
                    { '序号': 11, '姓名': '徐明', '性别': '男', '成绩': 82 },
                    { '序号': 12, '姓名': '孙丽', '性别': '女', '成绩': 91 },
                    { '序号': 13, '姓名': '林峰', '性别': '男', '成绩': 87 },
                    { '序号': 14, '姓名': '何雪', '性别': '女', '成绩': 79 },
                    { '序号': 15, '姓名': '郭凯', '性别': '男', '成绩': 94 },
                    { '序号': 16, '姓名': '马兰', '性别': '女', '成绩': 83 },
                    { '序号': 17, '姓名': '罗刚', '性别': '男', '成绩': 77 },
                    { '序号': 18, '姓名': '梁慧', '性别': '女', '成绩': 90 },
                    { '序号': 19, '姓名': '宋阳', '性别': '男', '成绩': 86 },
                    { '序号': 20, '姓名': '郑欣', '性别': '女', '成绩': 92 },
                    { '序号': 21, '姓名': '谢磊', '性别': '男', '成绩': 81 },
                    { '序号': 22, '姓名': '唐雅', '性别': '女', '成绩': 88 },
                    { '序号': 23, '姓名': '韩冰', '性别': '男', '成绩': 95 },
                    { '序号': 24, '姓名': '曹婷', '性别': '女', '成绩': 74 },
                    { '序号': 25, '姓名': '邓强', '性别': '男', '成绩': 89 },
                    { '序号': 26, '姓名': '许静', '性别': '女', '成绩': 93 },
                    { '序号': 27, '姓名': '冯浩', '性别': '男', '成绩': 80 },
                    { '序号': 28, '姓名': '彭雪', '性别': '女', '成绩': 85 },
                    { '序号': 29, '姓名': '蒋明', '性别': '男', '成绩': 91 },
                    { '序号': 30, '姓名': '蔡兰', '性别': '女', '成绩': 78 }
                ];
                clearAll();
                rawData = sampleData;
                headers = Object.keys(sampleData[0]);
                populateColumnSelect();
                const detected = autoDetectNameColumn();
                if (detected) {
                    colSelect.value = detected;
                    updateNameListFromColumn(detected);
                } else {
                    colSelect.value = headers[0];
                    updateNameListFromColumn(headers[0]);
                }
                updateVersionInfo();
            }

            // ============================================================
            //  翻页笔控制（基础版）
            // ============================================================

            function initPresenterControl() {
                document.addEventListener('keydown', function(e) {
                    if (e.target.closest('input, select, textarea')) return;

                    const key = e.key;

                    if (key === 'PageDown' || key === 'ArrowDown' || key === 'ArrowRight') {
                        e.preventDefault();
                        if (!startBtn.disabled) {
                            startBtn.click();
                        }
                        return;
                    }

                    if (key === 'PageUp' || key === 'ArrowUp' || key === 'ArrowLeft') {
                        e.preventDefault();
                        if (!stopBtn.disabled) {
                            stopBtn.click();
                        }
                        return;
                    }

                    if (key === ' ') {
                        e.preventDefault();
                        if (!startBtn.disabled) {
                            startBtn.click();
                        } else if (!stopBtn.disabled) {
                            stopBtn.click();
                        }
                        return;
                    }
                });

                console.log('📌 翻页笔控制已启用');
                console.log('   ▸ PageDown / ↓ / →  = 开始');
                console.log('   ▸ PageUp   / ↑ / ←  = 停止');
                console.log('   ▸ 空格键 = 开始/停止切换');
            }

            // ============================================================
            //  事件绑定
            // ============================================================

            importBtn.addEventListener('click', function() { fileInput.click(); });

            fileInput.addEventListener('change', function(e) {
                if (this.files && this.files.length > 0) {
                    handleFile(this.files[0]);
                    updateVersionInfo();
                }
                this.value = '';
            });

            localBtn.addEventListener('click', function() {
                if (hasData && !confirm('加载示例数据将覆盖当前内容，确认继续？')) return;
                loadSampleData();
                updateVersionInfo();
            });

            colSelect.addEventListener('change', function() {
                const col = this.value;
                if (col && rawData.length > 0) {
                    stopRolling();
                    const success = updateNameListFromColumn(col);
                    if (success) updateDisplay(currentIndex);
                    else {
                        mainNameEl.innerHTML = `<span class="hint">⚠️ 该列无有效数据</span>`;
                        prevNameText.textContent = '—';
                        nextNameText.textContent = '—';
                        startBtn.disabled = true;
                        stopBtn.disabled = true;
                    }
                    updateVersionInfo();
                }
            });

            clearBtn.addEventListener('click', function() {
                if (hasData && !confirm('确认清除所有数据吗？')) return;
                clearAll();
                updateVersionInfo();
            });

            startBtn.addEventListener('click', function() {
                if (!hasData || nameList.length === 0) { alert('请先导入数据或加载示例数据。'); return; }
                if (isRolling) return;
                if (nameList.length < 2) { alert('名单至少需要2人。'); return; }
                if (currentIndex < 0 || currentIndex >= nameList.length) {
                    currentIndex = Math.floor(Math.random() * nameList.length);
                }
                isRolling = true;
                startBtn.disabled = true;
                stopBtn.disabled = false;

                rollTimer = setInterval(() => {
                    let newIdx, attempts = 0;
                    do {
                        newIdx = Math.floor(Math.random() * nameList.length);
                        attempts++;
                    } while (newIdx === currentIndex && nameList.length > 1 && attempts < 20);
                    currentIndex = newIdx;
                    updateDisplay(currentIndex);
                }, 70);

                startMarquee();
            });

            stopBtn.addEventListener('click', function() {
                stopRolling();
                if (currentIndex >= 0 && currentIndex < nameList.length) updateDisplay(currentIndex);
            });

            // ---- 主题切换 ----
            themeBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const theme = this.dataset.theme;
                    document.documentElement.setAttribute('data-theme', theme);
                    themeBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');

                    const wasRunning = isMarqueeRunning;
                    rebuildMarquee(theme);
                    if (wasRunning) {
                        startMarquee();
                    }

                    localStorage.setItem('点名器_主题', theme);
                });
            });

            function restoreTheme() {
                const saved = localStorage.getItem('点名器_主题');
                if (saved && LIGHT_CONFIGS[saved]) {
                    document.documentElement.setAttribute('data-theme', saved);
                    themeBtns.forEach(b => b.classList.toggle('active', b.dataset.theme === saved));
                    currentTheme = saved;
                } else {
                    document.querySelector('.theme-btn[data-theme="neon"]')?.classList.add('active');
                    currentTheme = 'neon';
                }
                buildMarquee(currentTheme);
            }

            // ---- 窗口自适应 ----
            window.addEventListener('resize', handleResize);

            // ---- 初始化 ----
            function init() {
                restoreTheme();

                const hasRestored = restoreFromStorage();
                if (!hasRestored) {
                    if (!localStorage.getItem('点名器_已加载示例')) {
                        loadSampleData();
                        localStorage.setItem('点名器_已加载示例', 'true');
                    } else { clearAll(); }
                }
                if (!hasData) { startBtn.disabled = true;
                    stopBtn.disabled = true; }
                updateVersionInfo();

                initPresenterControl();

                setTimeout(() => {
                    rebuildMarquee(currentTheme);
                }, 100);

                console.log('📌 课堂点名器 v' + VERSION + ' 已启动');
                console.log('🎨 当前主题: ' + currentTheme);
                console.log('📌 翻页笔控制已启用');
                console.log('   ▸ PageDown / ↓ / →  = 开始');
                console.log('   ▸ PageUp   / ↑ / ←  = 停止');
            }

            setTimeout(init, 50);

            window.__app = {
                loadSampleData,
                clearAll,
                nameList: () => nameList,
                hasData: () => hasData,
                version: VERSION,
                startMarquee,
                stopMarquee: stopMarqueeWithFlash,
                rebuildMarquee,
                currentTheme: () => currentTheme
            };

        })();
