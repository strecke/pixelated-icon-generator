const CONFIG = {
    initGridSize: 16,
    transparencyPatternFactor: 1.5,
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

    bindEvents: function () {
        let lastGridSize = this.gridSize;

        const startHolding = factor => {
            lastGridSize = this.gridSize;
            this.updateGridSize(factor);

            this.holdTimer = setTimeout(() => {
                this.rapidInterval = setInterval(() => this.updateGridSize(factor), 50);
            }, 500);
        };

        const stopHolding = () => {
            clearTimeout(this.holdTimer);
            clearInterval(this.rapidInterval);
            if (lastGridSize !== this.gridSize) this.createGrid();
        };

        this.ui.btnPlus.addEventListener('pointerdown', () => startHolding(1));
        this.ui.btnMinus.addEventListener('pointerdown', () => startHolding(-1));

        this.ui.btnPlus.addEventListener('pointerup', () => stopHolding());
        this.ui.btnMinus.addEventListener('pointerup', () => stopHolding());

        document.addEventListener('lostpointercapture', () => stopHolding());

        this.ui.btnPlus.addEventListener('pointercancel', () => stopHolding());
        this.ui.btnMinus.addEventListener('pointercancel', () => stopHolding());

    },

    updateGridSize: function (factor = 0) {
        if (this.gridSize + factor < 2 || this.gridSize + factor > 100) return;
        this.gridSize += factor;
        this.ui.gridSizeSpan.textContent = `${this.gridSize} x ${this.gridSize}`;
        drawManager.initColorData();
    },

    createGrid: function () {
        this.ui.gridContainer.replaceChildren();
        for (let i = 0; i < this.gridSize; i++) {
            const row = document.createElement('div');
            row.classList.add('grid-row');
            for (let j = 0; j < this.gridSize; j++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = i;
                cell.dataset.column = j;
                row.appendChild(cell);
            }
            this.ui.gridContainer.appendChild(row);
        }
        const cell = this.ui.gridContainer.querySelector('.grid-cell');
        const rect = cell.getBoundingClientRect();
        this.updateTransparencyPattern(rect.width);
    },

    updateTransparencyPattern: function (cellSize) {
        const patternSize = cellSize / CONFIG.transparencyPatternFactor;
        const patternPosition = cellSize / (CONFIG.transparencyPatternFactor * 2);
        this.ui.gridContainer.style.backgroundSize = `${patternSize}px ${patternSize}px`;
        this.ui.gridContainer.style.backgroundPosition = `0 0, 0 ${patternPosition}px, ${patternPosition}px -${patternPosition}px, -${patternPosition}px 0`;
    },
};

gridSizeManager.init();

const toolbarManager = {
    ui: {},
    tools: ['draw', 'erase', 'fill', 'rainbow'],
    activeEditTool: 'draw',
    pickedColor: '#000000',

    init: function () {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function () {
        this.ui.toolbar = document.querySelector('.toolbar');
        this.ui.editTools = this.ui.toolbar.querySelectorAll('button.edit-group');
        this.ui.btnClear = this.ui.toolbar.querySelector('button.clear');
        this.ui.btnGrid = this.ui.toolbar.querySelector('button.grid');
        this.ui.btnDownload = this.ui.toolbar.querySelector('button.download');
        this.ui.btnSave = this.ui.toolbar.querySelector('button.save');
        this.ui.btnGallery = this.ui.toolbar.querySelector('button.gallery');
        this.ui.colorPicker = this.ui.toolbar.querySelector('input[type="color"]');
    },

    bindEvents: function () {
        this.ui.editTools.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.activeEditTool === btn.dataset.tool) return;
                this.setActiveTool(btn.dataset.tool);
            });
        });

        this.ui.btnClear.addEventListener('click', () => {
            gridSizeManager.createGrid();
            drawManager.initColorData();

        });

        this.ui.btnGrid.addEventListener('click', () => {
            this.ui.btnGrid.classList.toggle('active');
            drawManager.ui.gridContainer.classList.toggle('grid-active');
        });

        this.ui.btnDownload.addEventListener('click', () => {
            svgManager.downlaod();
        });

        this.ui.colorPicker.addEventListener('input', e => {
            this.onColorChange(e.target.value);
        });

        this.ui.btnSave.addEventListener('click', e => {
            saveManager.save();
        });

        this.ui.btnGallery.addEventListener('click', e => {
            saveManager.openGallery();
        });

        document.addEventListener('keyup', e => {
            if (e.key === 'd') this.setActiveTool('draw');
            else if (e.key === 'r') this.setActiveTool('rainbow');
            else if (e.key === 'f') this.setActiveTool('fill');
            else if (e.key === 'e') this.setActiveTool('erase');
            else if (e.key === 'c') this.ui.btnClear.click();
            else if (e.key === 'g') this.ui.btnGrid.click();
        });
    },

    setActiveTool: function (toolName) {
        const btn = this.ui.toolbar.querySelector(`button.edit-group[data-tool="${toolName}"]`)
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
    },

    cacheDOM: function () {
        this.ui.gridContainer = document.querySelector('.grid-container');
        this.ui.gridSizeContainer = document.querySelector('.grid-size-container');
        this.ui.gallery = document.querySelector('.gallery-container');
        this.ui.btnGallery = document.querySelector('button.gallery');
    },

    save: function () {
        const id = Date.now();
        const colorData = drawManager.colorData;
        const newState = { id, colorData, };
        this.colorStates.push(newState);

        localStorage.setItem('colorData', JSON.stringify(this.colorStates));
    },

    initLoad: function () {
        this.colorStates = JSON.parse(localStorage.getItem('colorData')) || [];
    },

    openGallery: function () {
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
            this.openGallery();
            drawManager.loadFromState(state.colorData);
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
    svg: null,
    svgns: 'http://www.w3.org/2000/svg',

    init: function () {
        this.cacheDOM();
        this.bindEvents();
        this.initSVG();
    },

    cacheDOM: function () {
        this.ui.svgOutput = document.querySelector('.svg-container .svg-output');
        this.ui.btnCopy = document.querySelector('.svg-container button');
        this.ui.btnCopyIcon = document.querySelector('.svg-container button span');
    },

    bindEvents: function () {
        this.ui.btnCopy.addEventListener('click', e => {
            this.copyLink();
        });
    },

    initSVG: function () {
        this.svg = document.createElementNS(this.svgns, 'svg');
        this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        this.svg.viewBox.baseVal.width = gridSizeManager.gridSize;
        this.svg.viewBox.baseVal.height = gridSizeManager.gridSize;
        this.displaySVG();
    },

    displaySVG: function () {
        this.ui.svgOutput.textContent = this.svg.outerHTML;
    },

    updateRect: function (row, column, color = 'none') {
        const oldRect = this.svg.querySelector(`rect[x="${column}"][y="${row}"]`);
        if (oldRect) this.svg.removeChild(oldRect);
        if (color !== 'none') {
            const rect = document.createElementNS(this.svgns, 'rect');
            rect.setAttribute('x', column);
            rect.setAttribute('y', row);
            rect.setAttribute('width', '1');
            rect.setAttribute('height', '1');
            rect.setAttribute('fill', color);

            this.svg.appendChild(rect);
        }
        this.displaySVG();
    },

    getSVGPreview: function (colorData) {
        const gridSize = colorData.length;
        const svg = document.createElementNS(this.svgns, 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.viewBox.baseVal.width = gridSize;
        svg.viewBox.baseVal.height = gridSize;
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const color = colorData[y][x];
                if (color !== 'none') {
                    const row = y;
                    const column = x;
                    const rect = document.createElementNS(this.svgns, 'rect');
                    rect.setAttribute('x', column);
                    rect.setAttribute('y', row);
                    rect.setAttribute('width', '1');
                    rect.setAttribute('height', '1');
                    rect.setAttribute('fill', color);

                    svg.appendChild(rect);
                }
            }
        }

        return svg;
    },

    downlaod: function () {
        const blob = new Blob([this.svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
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
            await navigator.clipboard.writeText(this.svg.outerHTML);
            this.ui.btnCopyIcon.classList.add('icon-success');

            this.copyLinkTimeout = setTimeout(() => this.ui.btnCopyIcon.classList.remove('icon-success'), 3000);
        } catch (error) {
            console.warn('Failed to copy: ', error);
        }
    },
};

svgManager.init();

const drawManager = {
    ui: {},
    active: false,
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
        this.colorData = Array.from({ length: gridSizeManager.gridSize }, () =>
            Array.from({ length: gridSizeManager.gridSize }, () => 'none')
        );
        svgManager.initSVG();
    },

    loadFromState: function (newColorData) {
        const newSize = newColorData.length;
        if (gridSizeManager.gridSize !== newSize) {
            gridSizeManager.gridSize = newSize;
            gridSizeManager.ui.gridSizeSpan.textContent = `${newSize} x ${newSize}`;
            gridSizeManager.createGrid();
        }

        this.colorData = JSON.parse(JSON.stringify(newColorData));
        svgManager.initSVG();
        for (let row = 0; row < newSize; row++) {
            for (let column = 0; column < newSize; column++) {
                const color = this.colorData[row][column];
                const cell = this.ui.gridContainer.querySelector(`.grid-cell[data-row="${row}"][data-column="${column}"]`);

                if (cell) cell.style.backgroundColor = color === 'none' ? '' : color;
                if (color === 'none') continue;
                svgManager.updateRect(row, column, color);
            }
        }
    },

    bindEvents: function () {
        this.ui.gridContainer.addEventListener('contextmenu', e => e.preventDefault());

        this.ui.gridContainer.addEventListener('pointerdown', e => {
            if (!e.target.classList.contains('grid-cell')) return;
            if (e.button === 2) {
                this.lastTool = toolbarManager.activeEditTool;
                const newTool = this.lastTool === 'erase' ? 'draw' : 'erase';
                toolbarManager.setActiveTool(newTool);
            }
            this.active = true;
            this.lastX = parseInt(e.target.dataset.column, 10);
            this.lastY = parseInt(e.target.dataset.row, 10);
            this[toolbarManager.activeEditTool](e.target);
        });

        this.ui.gridContainer.addEventListener('pointermove', e => {
            if (!this.active || !e.target.classList.contains('grid-cell')) return;
            const currentX = parseInt(e.target.dataset.column, 10);
            const currentY = parseInt(e.target.dataset.row, 10);
            if (this.lastX === currentX && this.lastY === currentY) return;
            if (toolbarManager.activeEditTool === 'fill') {
                this.fill(e.target);
            } else {
                this.drawLine(this.lastX, this.lastY, currentX, currentY);
            }

            this.lastX = currentX;
            this.lastY = currentY;
        });

        document.addEventListener('pointerup', e => {
            this.active = false;
            this.lastX = null;
            this.lastY = null;
            if (this.lastTool) {
                toolbarManager.setActiveTool(this.lastTool);
                this.lastTool = null;
            }
        });
    },

    drawLine: function (x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            const cell = this.ui.gridContainer.querySelector(`.grid-cell[data-column="${x0}"][data-row="${y0}"]`);
            if (cell) {
                this[toolbarManager.activeEditTool](cell);
            }

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    },

    draw: function (target) {
        const pickedColor = toolbarManager.pickedColor;
        target.style.backgroundColor = pickedColor;
        this.updateColorData(target, pickedColor);
    },

    erase: function (target) {
        target.style.backgroundColor = '';
        this.updateColorData(target);
    },

    fill: function (target) {
        const startX = parseInt(target.dataset.column, 10);
        const startY = parseInt(target.dataset.row, 10);
        const targetColor = this.colorData[startY][startX];
        const replacementColor = toolbarManager.pickedColor;
        if (targetColor === replacementColor) return;

        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const stack = [[startX, startY]];

        while (stack.length > 0) {
            const [x, y] = stack.pop();

            if (x < 0 || x >= gridSizeManager.gridSize || y < 0 || y >= gridSizeManager.gridSize) continue;
            if (this.colorData[y][x] === targetColor) {
                this.colorData[y][x] = replacementColor;

                const cell = this.ui.gridContainer.querySelector(`.grid-cell[data-column="${x}"][data-row="${y}"]`);
                if (cell) {
                    cell.style.backgroundColor = replacementColor === 'none' ? '' : replacementColor;
                    svgManager.updateRect(y, x, replacementColor);
                }
                for (let i = 0; i < directions.length; i++) {
                    stack.push([x + directions[i][0], y + directions[i][1]]);
                }
            }
        }
    },

    rainbow: function (target) {
        const randomR = Math.floor(Math.random() * 256);
        const randomG = Math.floor(Math.random() * 256);
        const randomB = Math.floor(Math.random() * 256);
        const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        toolbarManager.onColorChange(rgbToHex(randomR, randomG, randomB));
        this.draw(target);
    },

    updateColorData: function (target, color = 'none') {
        const row = target.dataset.row;
        const column = target.dataset.column;
        this.colorData[row][column] = color;
        svgManager.updateRect(row, column, color);
    },
};

drawManager.init();