const CONFIG = {
    initGridSize: 16,
    minGridSize: 2,
    maxGridSize: 100,
    transparencyPatternFactor: 1.5,
    holdDelay: 500,
    rapidSpeed: 50,
    maxHistory: 50,
    showSuccessDuration: 2000,
    shadeStep: 10,
};

const utils = {
    _timers: new WeakMap(),
    compressColor: function (hex) {
        if (!hex || hex === '') return '';
        if (hex.length === 7 && hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]) {
            return '#' + hex[1] + hex[3] + hex[5];
        }
        return hex;
    },
    decompressColor: function (hex) {
        if (!hex || hex === '') return '';
        return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b);
    },
    hexToRGB: function (hex) {
        const decompressedHex = this.decompressColor(hex).replace(/^#/, '');
        if (decompressedHex.length !== 6) return { r: 0, g: 0, b: 0 };
        return {
            r: parseInt(decompressedHex.substring(0, 2), 16),
            g: parseInt(decompressedHex.substring(2, 4), 16),
            b: parseInt(decompressedHex.substring(4, 6), 16),
        };
    },
    rgbToHex: function (r, g, b) {
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    },
    adjustColor: function (hex, percent = CONFIG.shadeStep) {
        const rgb = this.hexToRGB(hex);

        const step = Math.round(255 * (percent / 100));
        rgb.r = Math.max(0, Math.min(255, rgb.r + step));
        rgb.g = Math.max(0, Math.min(255, rgb.g + step));
        rgb.b = Math.max(0, Math.min(255, rgb.b + step));
        // if (percent > 0) {
        //     rgb.r = Math.round(rgb.r + (255 - rgb.r) * (percent / 100));
        //     rgb.g = Math.round(rgb.g + (255 - rgb.g) * (percent / 100));
        //     rgb.b = Math.round(rgb.b + (255 - rgb.b) * (percent / 100));
        // } else {
        //     rgb.r = Math.round(rgb.r * (1 + percent / 100));
        //     rgb.g = Math.round(rgb.g * (1 + percent / 100));
        //     rgb.b = Math.round(rgb.b * (1 + percent / 100));
        // }
        const newHex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
        return this.compressColor(newHex);
    },
    showSuccess: function (iconElement, duration = CONFIG.showSuccessDuration) {
        if (this._timers.has(iconElement)) clearTimeout(this._timers.get(iconElement));
        iconElement.classList.add('icon-success');
        const timerId = setTimeout(() => {
            iconElement.classList.remove('icon-success');
            this._timers.delete(iconElement);
        }, duration);
        this._timers.set(iconElement, timerId);
    },
};

const gridSizeManager = {
    ui: {},
    gridSize: CONFIG.initGridSize,
    holdTimer: null,
    rapidInterval: null,

    init: function () {
        this.cacheDOM();
        this.createGrid();
        this.bindEvents();
    },

    cacheDOM: function () {
        this.ui.btnPlus = document.querySelector('.grid-size-container .grid-size-plus');
        this.ui.btnMinus = document.querySelector('.grid-size-container .grid-size-minus');
        this.ui.gridContainer = document.querySelector('.grid-container');
        this.ui.gridSizeSpan = document.querySelector('.grid-size-container .grid-size');
    },

    getGridSize: function () {
        return this.gridSize;
    },

    bindEvents: function () {
        let lastGridSize = this.gridSize;

        const startHolding = factor => {
            lastGridSize = this.gridSize;
            this.updateGridSize(factor);

            this.holdTimer = setTimeout(() => {
                this.rapidInterval = setInterval(() => this.updateGridSize(factor), CONFIG.rapidSpeed);
            }, CONFIG.holdDelay);
        };

        const stopHolding = () => {
            clearTimeout(this.holdTimer);
            clearInterval(this.rapidInterval);
            if (lastGridSize !== this.gridSize) {
                this.createGrid();

                const event = new CustomEvent('gridSizeChanged', { detail: this.gridSize });
                document.dispatchEvent(event);
            }
        };

        this.ui.btnPlus.addEventListener('pointerdown', () => startHolding(1));
        this.ui.btnPlus.addEventListener('pointerup', stopHolding);
        this.ui.btnPlus.addEventListener('pointerleave', stopHolding);
        this.ui.btnPlus.addEventListener('pointercancel', stopHolding);

        this.ui.btnMinus.addEventListener('pointerdown', () => startHolding(-1));
        this.ui.btnMinus.addEventListener('pointerup', stopHolding);
        this.ui.btnMinus.addEventListener('pointerleave', stopHolding);
        this.ui.btnMinus.addEventListener('pointercancel', stopHolding);

        document.addEventListener('lostpointercapture', () => stopHolding());

        document.addEventListener('clearCanvas', () => this.createGrid());
    },

    updateGridSize: function (factor = 0) {
        if (this.gridSize + factor < CONFIG.minGridSize || this.gridSize + factor > CONFIG.maxGridSize) return;
        this.gridSize += factor;
        this.ui.gridSizeSpan.textContent = `${this.gridSize} x ${this.gridSize}`;
    },

    createGrid: function () {
        this.ui.gridContainer.replaceChildren();
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < this.gridSize; i++) {
            const row = document.createElement('div');
            row.className = 'grid-row';

            for (let j = 0; j < this.gridSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = i;
                cell.dataset.column = j;
                row.appendChild(cell);
            }
            fragment.appendChild(row);
        }
        this.ui.gridContainer.appendChild(fragment);
        this.updateTransparencyPattern();
    },

    updateTransparencyPattern: function () {
        const rect = this.ui.gridContainer.getBoundingClientRect();
        const cellSize = rect.width / this.gridSize;

        const patternSize = cellSize / CONFIG.transparencyPatternFactor;
        const patternPosition = cellSize / (CONFIG.transparencyPatternFactor * 2);

        this.ui.gridContainer.style.backgroundSize = `${patternSize}px ${patternSize}px`;
        this.ui.gridContainer.style.backgroundPosition = `0 0, 0 ${patternPosition}px, ${patternPosition}px -${patternPosition}px, -${patternPosition}px 0`;
    },
};

gridSizeManager.init();

const toolbarManager = {
    ui: {},
    tools: ['draw', 'erase', 'fill', 'rainbow', 'darken', 'brighten'],
    activeEditTool: 'draw',
    pickedColor: '#000000',
    holdTimer: null,
    rapidInterval: null,

    init: function () {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function () {
        this.ui.toolbar = document.querySelector('.toolbar');
        this.ui.actionbar = document.querySelector('.actionbar');
        this.ui.editTools = this.ui.toolbar.querySelectorAll('button.edit-group');
        this.ui.colorPicker = this.ui.toolbar.querySelector('input[type="color"]');
        this.ui.btnClear = this.ui.actionbar.querySelector('button.clear');
        this.ui.btnGrid = this.ui.actionbar.querySelector('button.grid');
        this.ui.btnDownload = this.ui.actionbar.querySelector('button.download');
        this.ui.btnSave = this.ui.actionbar.querySelector('button.save');
        this.ui.btnGallery = this.ui.actionbar.querySelector('button.gallery');
        this.ui.btnUndo = this.ui.actionbar.querySelector('button.undo');
        this.ui.btnRedo = this.ui.actionbar.querySelector('button.redo');
    },

    getActiveTool: function () {
        return this.activeEditTool;
    },

    getColor: function () {
        return utils.compressColor(this.pickedColor);
    },

    bindEvents: function () {
        this.ui.editTools.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.activeEditTool === btn.dataset.tool) return;
                this.setActiveTool(btn.dataset.tool);
            });
        });

        this.ui.btnClear.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('clearCanvas'));
        });

        this.ui.btnGrid.addEventListener('click', () => {

            this.ui.btnGrid.classList.toggle('active');
            document.dispatchEvent(new CustomEvent('toggleGridLines'));
        });

        this.ui.btnDownload.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('downloadSVG'));
            utils.showSuccess(this.ui.btnDownload.querySelector('.icon'));
        });

        this.ui.btnSave.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('saveState'));
        });

        this.ui.btnGallery.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('toggleGallery'));
        });

        const startHolding = e => {
            document.dispatchEvent(new CustomEvent(e));

            this.holdTimer = setTimeout(() => {
                this.rapidInterval = setInterval(() => {
                    document.dispatchEvent(new CustomEvent(e));
                }, CONFIG.rapidSpeed);
            }, CONFIG.holdDelay);
        };

        const stopHolding = () => {
            clearTimeout(this.holdTimer);
            clearInterval(this.rapidInterval);
        };

        this.ui.btnUndo.addEventListener('pointerdown', () => startHolding('undoAction'));
        this.ui.btnUndo.addEventListener('pointerup', stopHolding);
        this.ui.btnUndo.addEventListener('pointerleave', stopHolding);
        this.ui.btnUndo.addEventListener('pointercancel', stopHolding);

        this.ui.btnRedo.addEventListener('pointerdown', () => startHolding('redoAction'));
        this.ui.btnRedo.addEventListener('pointerup', stopHolding);
        this.ui.btnRedo.addEventListener('pointerleave', stopHolding);
        this.ui.btnRedo.addEventListener('pointercancel', stopHolding);

        this.ui.btnUndo.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('undoAction'));
        });

        this.ui.btnRedo.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('redoAction'));
        });

        this.ui.colorPicker.addEventListener('input', e => {
            this.onColorChange(e.target.value);
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'd') this.setActiveTool('draw');
            else if (e.key === 'r') this.setActiveTool('rainbow');
            else if (e.key === 'f') this.setActiveTool('fill');
            else if (e.key === 'e') this.setActiveTool('erase');
            else if (e.key === 'c') this.ui.btnClear.click();
            else if (e.key === 'g') this.ui.btnGrid.click();
            else if (e.ctrlKey && e.key === 'z') document.dispatchEvent(new CustomEvent('undoAction'));
            else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) document.dispatchEvent(new CustomEvent('redoAction'));
        });
    },

    setActiveTool: function (toolName) {
        const btn = this.ui.toolbar.querySelector(`button.edit-group[data-tool="${toolName}"]`);
        if (this.tools.includes(btn.dataset.tool) && btn) {
            this.ui.editTools.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.activeEditTool = btn.dataset.tool;
        }
    },

    onColorChange: function (color) {
        this.pickedColor = color;
        this.ui.colorPicker.value = color;
    },
};

toolbarManager.init();

const saveManager = {
    ui: {},
    colorStates: null,

    init: function () {
        this.cacheDOM();
        this.initLoad();
        this.bindEvents();
    },

    cacheDOM: function () {
        this.ui.gridContainer = document.querySelector('.grid-container');
        this.ui.gridSizeContainer = document.querySelector('.grid-size-container');
        this.ui.gallery = document.querySelector('.gallery-container');
        this.ui.btnGallery = document.querySelector('button.gallery');
    },

    initLoad: function () {
        this.colorStates = JSON.parse(localStorage.getItem('colorData')) || [];
    },

    bindEvents: function () {
        document.addEventListener('saveState', () => this.save());
        document.addEventListener('toggleGallery', () => this.toggleGallery());
    },

    save: function () {
        const id = Date.now();
        const currentColorData = drawManager.getColorData();
        const colorDataString = JSON.stringify(currentColorData);
        const existingIndex = this.colorStates.findIndex(state =>
            JSON.stringify(state.colorData) === colorDataString
        );

        if (existingIndex !== -1) {
            this.colorStates[existingIndex].id = id;
            const updatedState = this.colorStates.splice(existingIndex, 1)[0];
            this.colorStates.push(updatedState);
        } else {
            const colorDataCopy = JSON.parse(colorDataString);
            this.colorStates.push({ id, colorData: colorDataCopy, });
        }

        localStorage.setItem('colorData', JSON.stringify(this.colorStates));
        utils.showSuccess(toolbarManager.ui.btnSave.querySelector('.icon'));
    },

    toggleGallery: function () {
        this.ui.gridContainer.classList.toggle('close');
        this.ui.gridSizeContainer.classList.toggle('close');
        this.ui.gallery.classList.toggle('close');
        this.ui.btnGallery.classList.toggle('active');

        if (this.ui.gallery.classList.contains('close')) return;

        this.ui.gallery.replaceChildren();
        this.colorStates.forEach(state => {
            this.ui.gallery.appendChild(this.createItem(state));
        });

    },

    deleteEntry: function (id) {
        this.colorStates = this.colorStates.filter(state => state.id !== id);
        localStorage.setItem('colorData', JSON.stringify(this.colorStates));
    },

    createItem: function (state) {
        const item = document.createElement('div');
        const preview = document.createElement('div');
        const svg = svgManager.getSVGPreview(state.colorData);
        const date = document.createElement('span');
        const btnDelete = document.createElement('button');
        const iconDelete = document.createElement('span');

        item.className = 'gallery-item';
        item.dataset.id = state.id;
        preview.className = 'preview';
        date.classList = 'item-date';
        btnDelete.className = 'remove-item';
        iconDelete.className = 'icon icon-delete';

        preview.appendChild(svg);

        preview.addEventListener('click', e => {
            this.toggleGallery();
            document.dispatchEvent(new CustomEvent('loadState', { detail: state.colorData }));
        });

        const dateObject = new Date(state.id);
        const dateString = dateObject.toLocaleDateString();
        date.textContent = 'Saved at ' + dateString;

        btnDelete.addEventListener('click', () => {
            this.deleteEntry(state.id);
            item.remove();
        });

        btnDelete.appendChild(iconDelete);
        item.append(preview, date, btnDelete);

        return item;
    },
};

saveManager.init();

const svgManager = {
    ui: {},
    svgns: 'http://www.w3.org/2000/svg',

    init: function () {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function () {
        this.ui.svgContainer = document.querySelector('.svg-container');
        this.ui.btnGenerate = this.ui.svgContainer.querySelector('.generate-svg');
        this.ui.codeWrapper = this.ui.svgContainer.querySelector('.svg-code-wrapper');
        this.ui.svgOutput = this.ui.svgContainer.querySelector('.svg-output');
        this.ui.btnCopy = this.ui.svgContainer.querySelector('button.copy-svg');
        this.ui.btnCopyIcon = this.ui.btnCopy.querySelector('span');
    },

    bindEvents: function () {
        this.ui.btnGenerate.addEventListener('click', () => this.showSVGCode());
        this.ui.btnCopy.addEventListener('click', e => this.copyLink());

        document.addEventListener('downloadSVG', () => this.download());

        const resetSVGView = () => {
            this.ui.codeWrapper.classList.add('close');
            this.ui.btnGenerate.classList.remove('close');
        };

        document.addEventListener('pixelChanged', resetSVGView);
        document.addEventListener('clearCanvas', resetSVGView);
        document.addEventListener('canvasRebuilt', resetSVGView);
        document.addEventListener('gridSizeChanged', resetSVGView);
    },

    getSVGPreview: function (colorData) {
        const gridSize = colorData.length;
        const svg = document.createElementNS(this.svgns, 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.viewBox.baseVal.width = gridSize;
        svg.viewBox.baseVal.height = gridSize;
        svg.setAttribute('shape-rendering', 'crispEdges');

        const rectsByColor = {};

        for (let y = 0; y < gridSize; y++) {
            let x = 0;
            while (x < gridSize) {
                const color = colorData[y][x];

                if (color === '') {
                    x++;
                    continue;
                }

                let startX = x;
                while (x < gridSize && colorData[y][x] === color) {
                    x++;
                }
                let width = x - startX;

                if (!rectsByColor[color]) rectsByColor[color] = [];
                const colorRects = rectsByColor[color];

                let merged = false;

                for (let i = colorRects.length - 1; i >= 0; i--) {
                    const r = colorRects[i];
                    if (r.x === startX && r.w === width && r.y + r.h === y) {
                        r.h += 1;
                        colorRects.push(colorRects.splice(i, 1)[0]);
                        merged = true;
                        break;
                    }
                }
                if (!merged) colorRects.push({ x: startX, y: y, w: width, h: 1 });

            }
        }

        for (const [color, rects] of Object.entries(rectsByColor)) {
            let pathData = '';
            for (const r of rects) {
                pathData += `M${r.x} ${r.y} h${r.w} v${r.h} h-${r.w} Z `;
            }

            const path = document.createElementNS(this.svgns, 'path');
            path.setAttribute('fill', color);
            path.setAttribute('d', pathData.trim());
            svg.appendChild(path);
        }

        return svg;
    },

    showSVGCode: function () {
        const currentData = drawManager.getColorData();
        const svg = this.getSVGPreview(currentData);

        this.ui.svgOutput.textContent = svg.outerHTML;
        this.ui.codeWrapper.classList.remove('close');
        this.ui.btnGenerate.classList.add('close');
    },

    download: function () {
        const currentData = drawManager.getColorData();
        const svg = this.getSVGPreview(currentData);

        const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'icon.svg';
        document.body.append(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    copyLinkTimeout: null,

    copyLink: async function () {
        if (this.copyLinkTimeout) clearTimeout(this.copyLinkTimeout);
        try {
            await navigator.clipboard.writeText(this.ui.svgOutput.textContent);
            utils.showSuccess(this.ui.btnCopyIcon);
        } catch (error) {
            console.warn('Failed to copy: ', error);
        }
    },
};

svgManager.init();

const drawManager = {
    ui: {},
    active: false,
    hasChanged: false,
    lastTool: null,
    lastX: null,
    lastY: null,
    colorData: null,
    init: function () {
        this.cacheDOM();
        this.initColorData();
        this.bindEvents();
    },

    cacheDOM: function () {
        this.ui.gridContainer = document.querySelector('.grid-container');
    },

    initColorData: function () {
        this.colorData = Array.from({ length: gridSizeManager.getGridSize() }, () =>
            Array.from({ length: gridSizeManager.getGridSize() }, () => '')
        );
    },

    getColorData: function () {
        return this.colorData;
    },

    bindEvents: function () {
        this.ui.gridContainer.addEventListener('contextmenu', e => e.preventDefault());

        this.ui.gridContainer.addEventListener('pointerdown', e => {
            if (!e.target.classList.contains('grid-cell')) return;
            if (e.button === 2) {
                this.lastTool = toolbarManager.getActiveTool();
                const newTool = this.lastTool === 'erase' ? 'draw' : 'erase';
                toolbarManager.setActiveTool(newTool);
            }
            this.active = true;
            this.hasChanged = false;
            this.lastX = parseInt(e.target.dataset.column, 10);
            this.lastY = parseInt(e.target.dataset.row, 10);
            this[toolbarManager.getActiveTool()](e.target);
        });

        this.ui.gridContainer.addEventListener('pointermove', e => {
            if (!this.active || !e.target.classList.contains('grid-cell')) return;
            const currentX = parseInt(e.target.dataset.column, 10);
            const currentY = parseInt(e.target.dataset.row, 10);
            if (this.lastX === currentX && this.lastY === currentY) return;
            if (toolbarManager.getActiveTool() === 'fill') {
                this.fill(e.target);
            } else {
                this.drawLine(this.lastX, this.lastY, currentX, currentY);
            }

            this.lastX = currentX;
            this.lastY = currentY;
        });

        document.addEventListener('pointerup', e => {
            if (this.active && this.hasChanged) document.dispatchEvent(new CustomEvent('saveHistory'));
            this.active = false;
            this.hasChanged = false;
            this.lastX = null;
            this.lastY = null;
            if (this.lastTool) {
                toolbarManager.setActiveTool(this.lastTool);
                this.lastTool = null;
            }
        });

        document.addEventListener('gridSizeChanged', () => this.initColorData());
        document.addEventListener('clearCanvas', () => this.initColorData());
        document.addEventListener('toggleGridLines', () => this.ui.gridContainer.classList.toggle('grid-active'));
        document.addEventListener('loadState', e => this.loadFromData(e.detail));
        document.addEventListener('restoreHistoryState', e => this.loadFromData(e.detail));
    },

    loadFromData: function (newColorData) {
        const newSize = newColorData.length;

        if (gridSizeManager.getGridSize() !== newSize) {
            gridSizeManager.gridSize = newSize;
            gridSizeManager.ui.gridSizeSpan.textContent = `${newSize} x ${newSize}`;
            gridSizeManager.createGrid();
        }

        this.colorData = JSON.parse(JSON.stringify(newColorData));

        for (let row = 0; row < newSize; row++) {
            for (let column = 0; column < newSize; column++) {
                const color = this.colorData[row][column];
                const rowEl = this.ui.gridContainer.children[row];
                if (rowEl) {
                    const cell = rowEl.children[column];
                    if (cell) cell.style.backgroundColor = color;
                }
            }
        }
        document.dispatchEvent(new CustomEvent('canvasRebuilt', { detail: this.colorData }));
    },

    drawLine: function (x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;
        let isFirstPixel = true;

        while (true) {
            if (!isFirstPixel) {
                const rowEl = this.ui.gridContainer.children[y0];
                if (rowEl) {
                    const cell = rowEl.children[x0];
                    if (cell) this[toolbarManager.getActiveTool()](cell);
                }
            }
            isFirstPixel = false;

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    },

    draw: function (target) {
        const pickedColor = toolbarManager.getColor();
        if (this.updateColorData(target, pickedColor)) {
            target.style.backgroundColor = pickedColor;
        }
    },

    darken: function (target) {
        const row = parseInt(target.dataset.row, 10);
        const column = parseInt(target.dataset.column, 10);
        const currentColor = this.colorData[row][column];

        if (!currentColor || currentColor === '#000' || currentColor === '#000000') return;

        const newColor = utils.adjustColor(currentColor, -CONFIG.shadeStep);

        if (this.updateColorData(target, newColor)) target.style.backgroundColor = newColor;
    },

    brighten: function (target) {
        const row = parseInt(target.dataset.row, 10);
        const column = parseInt(target.dataset.column, 10);
        const currentColor = this.colorData[row][column];

        if (!currentColor || currentColor === '#fff' || currentColor === '#ffffff') return;

        const newColor = utils.adjustColor(currentColor, CONFIG.shadeStep);

        if (this.updateColorData(target, newColor)) target.style.backgroundColor = newColor;
    },

    erase: function (target) {
        if (this.updateColorData(target)) target.style.backgroundColor = '';
    },

    fill: function (target) {
        const startX = parseInt(target.dataset.column, 10);
        const startY = parseInt(target.dataset.row, 10);
        const targetColor = this.colorData[startY][startX];
        const replacementColor = toolbarManager.getColor();
        if (targetColor === replacementColor) return;

        this.hasChanged = true;
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const stack = [[startX, startY]];

        const gridSize = gridSizeManager.getGridSize();

        while (stack.length > 0) {
            const [x, y] = stack.pop();

            if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;

            if (this.colorData[y][x] === targetColor) {
                this.colorData[y][x] = replacementColor;

                const rowEl = this.ui.gridContainer.children[y];
                if (rowEl) {
                    const cellEl = rowEl.children[x];
                    if (cellEl) cellEl.style.backgroundColor = replacementColor;
                }
                for (let i = 0; i < directions.length; i++) {
                    stack.push([x + directions[i][0], y + directions[i][1]]);
                }
            }
        }
        document.dispatchEvent(new CustomEvent('canvasRebuilt', { detail: this.colorData }));
    },

    rainbow: function (target) {
        const randomR = Math.floor(Math.random() * 256);
        const randomG = Math.floor(Math.random() * 256);
        const randomB = Math.floor(Math.random() * 256);
        toolbarManager.onColorChange(utils.rgbToHex(randomR, randomG, randomB));
        this.draw(target);
    },

    updateColorData: function (target, color = '') {
        const row = parseInt(target.dataset.row, 10);
        const column = parseInt(target.dataset.column, 10);
        const compressedColor = utils.compressColor(color);

        if (this.colorData[row][column] !== compressedColor) {
            this.colorData[row][column] = compressedColor;
            this.hasChanged = true;
            document.dispatchEvent(new CustomEvent('pixelChanged', { detail: { row, column, color: compressedColor } }));
            return true;
        }
        return false;
    },
};

drawManager.init();

const historyManager = {
    undoStack: [],
    redoStack: [],

    init: function () {
        this.bindEvents();
        this.saveState();
    },

    bindEvents: function () {
        document.addEventListener('undoAction', () => this.undo());
        document.addEventListener('redoAction', () => this.redo());
        document.addEventListener('saveHistory', () => this.saveState());

        document.addEventListener('clearCanvas', () => {
            setTimeout(() => this.saveState(), 10);
        });

        document.addEventListener('gridSizeChanged', () => {
            setTimeout(() => this.saveState(), 10);
        });

        document.addEventListener('loadState', () => this.resetHistory());
    },

    saveState: function () {
        const currentState = JSON.parse(JSON.stringify(drawManager.getColorData()));
        this.undoStack.push(currentState);
        if (this.undoStack.length > CONFIG.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    },

    undo: function () {
        if (this.undoStack.length <= 1) return;

        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);

        const previousState = this.undoStack[this.undoStack.length - 1];
        document.dispatchEvent(new CustomEvent('restoreHistoryState', { detail: previousState }));
    },

    redo: function () {
        if (this.redoStack.length === 0) return;

        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);
        document.dispatchEvent(new CustomEvent('restoreHistoryState', { detail: nextState }));
    },

    resetHistory: function () {
        this.undoStack = [];
        this.redoStack = [];
        this.saveState();
    },
};

historyManager.init();