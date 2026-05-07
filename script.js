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
    maxColorHistory: 6,
    scrollTolerance: 3,
    allowedFileTypes: '.svg, .png, .jpg, .jpeg, .webp',
    allowedRegexFileTypes: /image\/(svg\+xml|png|jpeg|webp)/i,
};

const EVENTS = {
    clearCanvas: 'clearCanvas',
    gridSizeChanged: 'gridSizeChanged',
    saveHistory: 'saveHistory',
    undoAction: 'undoAction',
    redoAction: 'redoAction',
    changeGridSize: 'changeGridSize',
    fillBackground: 'fillBackground',
    restoreHistoryState: 'restoreHistoryState',
    pixelChanged: 'pixelChanged',
    toggleGridLines: 'toggleGridLines',
    rotateCanvas: 'rotateCanvas',
    mirrorCanvas: 'mirrorCanvas',
    downloadSVG: 'downloadSVG',
    saveState: 'saveState',
    loadState: 'loadState',
    toggleMirrorX: 'toggleMirrorX',
    toggleMirrorY: 'toggleMirrorY',
    toggleGallery: 'toggleGallery',
    canvasRebuilt: 'canvasRebuilt',
    toggleHints: 'toggleHints'
}

const utils = {
    _timers: new WeakMap(),
    compressColor: function (hex) {
        if (typeof hex !== 'string' || hex === '') return '';
        if (hex.length === 7 && hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]) {
            return '#' + hex[1] + hex[3] + hex[5];
        }
        return hex;
    },
    decompressColor: function (hex) {
        if (typeof hex !== 'string' || hex === '') return '';
        return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b);
    },
    hexToRGB: function (hex) {
        if (typeof hex !== 'string' || hex === '') return { r: 0, g: 0, b: 0 };
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
        this.ui.btnScale = document.querySelector('.grid-size-container .grid-size-scale');
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

                const event = new CustomEvent(EVENTS.gridSizeChanged, { detail: this.gridSize });
                document.dispatchEvent(event);
                lastGridSize = this.gridSize;
            }
        };

        this.ui.btnPlus.addEventListener('pointerdown', () => startHolding(1));
        this.ui.btnPlus.addEventListener('pointerup', stopHolding);
        this.ui.btnPlus.addEventListener('pointerleave', stopHolding);
        this.ui.btnPlus.addEventListener('pointercancel', stopHolding);
        this.ui.btnPlus.addEventListener('contextmenu', e => e.preventDefault());

        this.ui.btnMinus.addEventListener('pointerdown', () => startHolding(-1));
        this.ui.btnMinus.addEventListener('pointerup', stopHolding);
        this.ui.btnMinus.addEventListener('pointerleave', stopHolding);
        this.ui.btnMinus.addEventListener('pointercancel', stopHolding);
        this.ui.btnMinus.addEventListener('contextmenu', e => e.preventDefault());

        document.addEventListener('lostpointercapture', () => stopHolding());

        document.addEventListener(EVENTS.changeGridSize, e => {
            const factor = e.detail;
            lastGridSize = this.gridSize;
            this.updateGridSize(factor);
            if (lastGridSize !== this.gridSize) {
                this.createGrid();
                document.dispatchEvent(new CustomEvent(EVENTS.gridSizeChanged, { detail: this.gridSize }));
            }
        });

        this.ui.btnScale.addEventListener('click', () => this.ui.btnScale.classList.toggle('active'));
    },

    updateGridSize: function (factor = 0) {
        const isScale = this.ui.btnScale.classList.contains('active');
        let newSize = this.gridSize;

        if (isScale && Math.abs(factor) === 1) {
            if (factor > 0) newSize = this.gridSize * 2;
            else if (factor < 0) newSize = Math.floor(this.gridSize / 2);
        } else {
            newSize = this.gridSize + factor;
        }
        if (newSize < CONFIG.minGridSize || newSize > CONFIG.maxGridSize) return;

        this.gridSize = newSize;
        this.ui.gridSizeSpan.textContent = `${this.gridSize} x ${this.gridSize}`;
    },

    createGrid: function () {
        const currentRows = this.ui.gridContainer.children;
        const currentSize = currentRows.length;
        const targetSize = this.gridSize;

        if (currentSize === targetSize) {
            this.updateTransparencyPattern();
            return;
        }

        const createCell = (r, c) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = r;
            cell.dataset.column = c;
            return cell;
        };

        if (targetSize > currentSize) {
            for (let i = 0; i < currentSize; i++) {
                const row = currentRows[i];
                const fragment = document.createDocumentFragment();
                for (let j = currentSize; j < targetSize; j++) {
                    fragment.appendChild(createCell(i, j));
                }
                row.appendChild(fragment);
            }

            const rowFragment = document.createDocumentFragment();
            for (let i = currentSize; i < targetSize; i++) {
                const row = document.createElement('div');
                row.className = 'grid-row';
                for (let j = 0; j < targetSize; j++) {
                    row.appendChild(createCell(i, j));
                }
                rowFragment.appendChild(row);
            }
            this.ui.gridContainer.appendChild(rowFragment);
        } else {
            while (this.ui.gridContainer.children.length > targetSize) {
                this.ui.gridContainer.lastElementChild.remove();
            }
            for (let i = 0; i < targetSize; i++) {
                const row = this.ui.gridContainer.children[i];
                while (row.children.length > targetSize) row.lastElementChild.remove();
            }
        }
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
    tools: ['draw', 'erase', 'fill', 'rainbow', 'darken', 'brighten', 'picker', 'move'],
    activeEditTool: 'draw',
    previousTool: 'draw',
    pickedColor: '#000000',
    colorHistory: [],
    holdTimer: null,
    rapidInterval: null,
    isMirrorX: false,
    isMirrorY: false,

    init: function () {
        this.cacheDOM();
        this.bindEvents();
        this.onColorChange(this.pickedColor);
    },

    cacheDOM: function () {
        this.ui.toolbar = document.querySelector('.toolbar');
        this.ui.actionbar = document.querySelector('.actionbar');
        this.ui.editTools = this.ui.toolbar.querySelectorAll('button.edit-group');
        this.ui.colorPicker = this.ui.toolbar.querySelector('input[type="color"]');
        this.ui.colorHistoryContainer = this.ui.toolbar.querySelector('.color-history');
        this.ui.btnDrawX = this.ui.toolbar.querySelector('button.draw-x');
        this.ui.btnDrawY = this.ui.toolbar.querySelector('button.draw-y');
        this.ui.btnClear = this.ui.actionbar.querySelector('button.clear');
        this.ui.btnGrid = this.ui.actionbar.querySelector('button.grid');
        this.ui.btnDownload = this.ui.actionbar.querySelector('button.download');
        this.ui.btnSave = this.ui.actionbar.querySelector('button.save');
        this.ui.btnGallery = this.ui.actionbar.querySelector('button.gallery');
        this.ui.btnUndo = this.ui.actionbar.querySelector('button.undo');
        this.ui.btnRedo = this.ui.actionbar.querySelector('button.redo');
        this.ui.btnRotate = this.ui.toolbar.querySelector('button.rotate');
        this.ui.btnMirror = this.ui.toolbar.querySelector('button.mirror');
        this.ui.btnMove = this.ui.toolbar.querySelector('button.move');
        this.ui.btnBgFill = this.ui.toolbar.querySelector('button.bg-fill');
        this.ui.btnGenerate = this.ui.actionbar.querySelector('button.generate-svg');
        this.ui.btnUpload = this.ui.actionbar.querySelector('button.upload');
        this.ui.helpModal = document.getElementById('help-modal');
    },

    getActiveTool: function () {
        return this.activeEditTool;
    },

    getPreviousTool: function () {
        return this.previousTool;
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
            document.dispatchEvent(new CustomEvent(EVENTS.clearCanvas));
        });

        this.ui.btnGrid.addEventListener('click', () => {
            this.ui.btnGrid.classList.toggle('active');
            document.dispatchEvent(new CustomEvent(EVENTS.toggleGridLines));
        });

        this.ui.btnRotate.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent(EVENTS.rotateCanvas));
        });

        this.ui.btnMirror.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent(EVENTS.mirrorCanvas));
        });

        this.ui.btnBgFill.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent(EVENTS.fillBackground));
        });

        this.ui.btnDownload.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent(EVENTS.downloadSVG));
            utils.showSuccess(this.ui.btnDownload.querySelector('.icon'));
        });

        this.ui.btnSave.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent(EVENTS.saveState));
            utils.showSuccess(this.ui.btnSave.querySelector('.icon'));
        });

        this.ui.btnDrawX.addEventListener('click', () => {
            this.isMirrorX = !this.isMirrorX;
            this.ui.btnDrawX.classList.toggle('active', this.isMirrorX);
            document.dispatchEvent(new CustomEvent(EVENTS.toggleMirrorX, { detail: this.isMirrorX }));
        });

        this.ui.btnDrawY.addEventListener('click', () => {
            this.isMirrorY = !this.isMirrorY;
            this.ui.btnDrawY.classList.toggle('active', this.isMirrorY);
            document.dispatchEvent(new CustomEvent(EVENTS.toggleMirrorY, { detail: this.isMirrorY }));
        });

        this.ui.btnGallery.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent(EVENTS.toggleGallery));
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

        this.ui.btnUndo.addEventListener('pointerdown', () => startHolding(EVENTS.undoAction));
        this.ui.btnUndo.addEventListener('pointerup', stopHolding);
        this.ui.btnUndo.addEventListener('pointerleave', stopHolding);
        this.ui.btnUndo.addEventListener('pointercancel', stopHolding);
        this.ui.btnUndo.addEventListener('contextmenu', e => e.preventDefault());

        this.ui.btnRedo.addEventListener('pointerdown', () => startHolding(EVENTS.redoAction));
        this.ui.btnRedo.addEventListener('pointerup', stopHolding);
        this.ui.btnRedo.addEventListener('pointerleave', stopHolding);
        this.ui.btnRedo.addEventListener('pointercancel', stopHolding);
        this.ui.btnRedo.addEventListener('contextmenu', e => e.preventDefault());

        this.ui.colorPicker.addEventListener('input', e => {
            this.onColorChange(e.target.value, true);
            const currentTool = this.getActiveTool();
            if (currentTool !== 'fill') this.setActiveTool('draw');
        });

        this.ui.colorPicker.addEventListener('change', e => {
            this.addToColorHistory(e.target.value);
        });

        document.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLocaleLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) document.dispatchEvent(new CustomEvent(EVENTS.redoAction));
                        else document.dispatchEvent(new CustomEvent(EVENTS.undoAction));
                        break;
                    case 'y':
                        e.preventDefault();
                        document.dispatchEvent(new CustomEvent(EVENTS.redoAction));
                        break;
                    case 's':
                        e.preventDefault();
                        this.ui.btnSave.click();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.ui.btnDownload.click();
                        break;
                    case 'u':
                        e.preventDefault();
                        this.ui.btnUpload.click();
                        break;
                    case 'g':
                        e.preventDefault();
                        this.ui.btnGallery.click();
                        break;
                    case 'c':
                        e.preventDefault();
                        this.ui.btnGenerate.click();
                        break;
                }
            } else {
                switch (e.key.toLowerCase()) {
                    case 'd': this.setActiveTool('draw'); break;
                    case 'r': this.setActiveTool('rainbow'); break;
                    case 'e': this.setActiveTool('erase'); break;
                    case 'f': this.setActiveTool('fill'); break;
                    case 'p': this.setActiveTool('picker'); break;
                    case 'm': this.setActiveTool('move'); break;
                    case 'c': this.ui.btnClear.click(); break;
                    case 'g': this.ui.btnGrid.click(); break;
                    case 'b': this.ui.btnBgFill.click(); break;
                    case 'o': this.ui.btnRotate.click(); break;
                    case 'i': this.ui.btnMirror.click(); break;
                    case 'x': this.ui.btnDrawX.click(); break;
                    case 'y': this.ui.btnDrawY.click(); break;
                    case 'h': this.ui.btnWelcome.click(); break;
                    case 'k': this.setActiveTool('brighten'); break;
                    case 'l': this.setActiveTool('darken'); break;
                    case 'escape':
                        if (!saveManager.ui.gallery.classList.contains('close')) this.ui.btnGallery.click();
                        break;
                    case '+':
                        document.dispatchEvent(new CustomEvent(EVENTS.changeGridSize, { detail: 1 }));
                        break;
                    case '-':
                        document.dispatchEvent(new CustomEvent(EVENTS.changeGridSize, { detail: -1 }));
                        break;
                    case 's': gridSizeManager.ui.btnScale.click(); break;
                    case 't':
                        document.dispatchEvent(new CustomEvent(EVENTS.toggleHints));
                        break;
                }
            }
        });

        this.ui.helpModal.addEventListener('click', (e) => {
            const dialogDimensions = this.ui.helpModal.getBoundingClientRect();
            if (
                e.clientX < dialogDimensions.left ||
                e.clientX > dialogDimensions.right ||
                e.clientY < dialogDimensions.top ||
                e.clientY > dialogDimensions.bottom
            ) {
                this.ui.helpModal.close();
            }
        });
    },

    setActiveTool: function (toolName) {
        const btn = this.ui.toolbar.querySelector(`button.edit-group[data-tool="${toolName}"]`);
        if (this.tools.includes(btn.dataset.tool) && btn) {
            this.ui.editTools.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.previousTool = this.activeEditTool;
            this.activeEditTool = btn.dataset.tool;
        }
    },

    onColorChange: function (color, ignoreHistory = false) {
        this.pickedColor = color;
        this.ui.colorPicker.value = color;
        if (!ignoreHistory) this.addToColorHistory(color);
    },

    addToColorHistory: function (color) {
        this.colorHistory = this.colorHistory.filter(c => c !== color);
        this.colorHistory.unshift(color);
        if (this.colorHistory.length > CONFIG.maxColorHistory) this.colorHistory.pop();
        this.renderColorHistory();
    },

    renderColorHistory: function () {
        this.ui.colorHistoryContainer.replaceChildren();

        this.colorHistory.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color;

            swatch.addEventListener('click', () => {
                this.onColorChange(color);
                if (this.getActiveTool() !== 'fill') this.setActiveTool('draw');
            });
            this.ui.colorHistoryContainer.appendChild(swatch);
        });
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
        try {
            const storedData = localStorage.getItem('colorData');
            this.colorStates = storedData ? JSON.parse(storedData) : [];
        } catch (error) {
            console.error('Loading error: ', error);
            this.colorStates = [];
        }
    },

    bindEvents: function () {
        document.addEventListener(EVENTS.saveState, () => this.save());
        document.addEventListener(EVENTS.toggleGallery, () => this.toggleGallery());
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

        if (!this.ui.gallery.classList.contains('close')) {
            this.renderGallery();
        }
    },

    toggleGallery: function () {
        this.ui.gridContainer.classList.toggle('close');
        this.ui.gridSizeContainer.classList.toggle('close');
        this.ui.gallery.classList.toggle('close');
        this.ui.btnGallery.classList.toggle('active');

        if (this.ui.gallery.classList.contains('close')) return;

        this.renderGallery();
    },

    renderGallery: function () {
        this.ui.gallery.replaceChildren();
        if (this.colorStates.length === 0) {
            const emptyState = document.createElement('div');
            const p1 = document.createElement('p');
            const p2 = document.createElement('p');
            const button = document.createElement('button');
            const iconSpan = document.createElement('span');

            emptyState.className = 'gallery-empty-state';
            iconSpan.className = 'icon icon-save';
            p1.textContent = 'No items yet.';
            button.title = 'Save (ctrl + s)';
            button.appendChild(iconSpan);
            p2.append('Draw something and click ', button, ' to save it here!');
            emptyState.append(p1, p2);
            this.ui.gallery.appendChild(emptyState);
            return;
        }
        this.colorStates.forEach(state => {
            this.ui.gallery.prepend(this.createItem(state));
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
            document.dispatchEvent(new CustomEvent(EVENTS.loadState, { detail: state.colorData }));
        });

        const dateObject = new Date(state.id);
        const dateString = dateObject.toLocaleDateString();
        date.textContent = 'Saved at ' + dateString;

        btnDelete.addEventListener('click', () => {
            this.deleteEntry(state.id);
            item.remove();
            if (this.colorStates.length === 0) this.renderGallery();
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
        this.ui.btnGenerate = toolbarManager.ui.btnGenerate;
        this.ui.codeWrapper = this.ui.svgContainer.querySelector('.svg-code-wrapper');
        this.ui.svgOutput = this.ui.svgContainer.querySelector('.svg-output');
        this.ui.btnCopy = this.ui.svgContainer.querySelector('button.copy-svg');
        this.ui.btnCopyIcon = this.ui.btnCopy.querySelector('span');
        this.ui.fileInput = document.createElement('input');
        this.ui.fileInput.type = 'file';
        this.ui.fileInput.accept = CONFIG.allowedFileTypes;
        this.ui.btnUpload = toolbarManager.ui.btnUpload;
    },

    bindEvents: function () {
        this.ui.btnGenerate.addEventListener('click', () => this.showSVGCode());
        this.ui.btnCopy.addEventListener('click', e => this.copyLink());
        this.ui.btnUpload.addEventListener('click', () => this.ui.fileInput.click());
        this.ui.fileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) this.processFile(file);
            e.target.value = '';
        });

        document.addEventListener(EVENTS.downloadSVG, () => this.download());

        const resetSVGView = () => {
            this.ui.codeWrapper.classList.add('close');
        };

        document.addEventListener(EVENTS.pixelChanged, resetSVGView);
        document.addEventListener(EVENTS.clearCanvas, resetSVGView);
        document.addEventListener(EVENTS.canvasRebuilt, resetSVGView);
        document.addEventListener(EVENTS.gridSizeChanged, resetSVGView);

        ['dragover', 'drop'].forEach(eventName => {
            window.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        document.addEventListener('dragenter', e => {
            document.body.classList.add('drag-active');
        });

        document.addEventListener('dragleave', e => {
            if (!e.relatedTarget) document.body.classList.remove('drag-active');
        });

        document.addEventListener('drop', e => {
            document.body.classList.remove('drag-active');
            const file = e.dataTransfer.files[0];
            if (file && CONFIG.allowedRegexFileTypes.test(file.type)) {
                this.processFile(file);
            }
        });
    },

    processFile: function (file) {
        if (!file || !CONFIG.allowedRegexFileTypes.test(file.type)) return;
        // check whether the SVG was created using this tool
        if (file.type === 'image/svg+xml') {
            const reader = new FileReader();
            reader.onload = event => {
                let detectedSize = null;
                try {
                    const doc = new DOMParser().parseFromString(event.target.result, 'image/svg+xml');
                    const svgElement = doc.querySelector('svg');

                    if (svgElement && svgElement.getAttribute('data-pixel-art') === 'true') {
                        const viewBox = svgElement.getAttribute('viewBox');
                        if (viewBox) {
                            const [, , w, h] = viewBox.split(' ').map(Number);
                            if (w === h && w >= CONFIG.minGridSize && w <= CONFIG.maxGridSize) {
                                detectedSize = w;
                            }
                        }
                    }
                } catch (error) {
                    console.error('SVG Import Error:', error);
                }
                const url = URL.createObjectURL(file);
                this.rasterizeImageToGrid(url, detectedSize);
            }
            reader.readAsText(file);
        } else {
            const url = URL.createObjectURL(file);
            this.rasterizeImageToGrid(url, null);
        }
    },

    rasterizeImageToGrid: function (imageUrl, detectedSize) {
        const img = new Image();
        img.onload = () => {
            const size = detectedSize ? detectedSize : gridSizeManager.getGridSize();

            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, size, size);
            const imageData = ctx.getImageData(0, 0, size, size).data;

            const newColorData = drawManager.createEmptyGrid(size);
            let dataIndex = 0;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const r = imageData[dataIndex];
                    const g = imageData[dataIndex + 1];
                    const b = imageData[dataIndex + 2];
                    const alpha = imageData[dataIndex + 3];

                    if (alpha > 10) {
                        newColorData[y][x] = utils.compressColor(utils.rgbToHex(r, g, b));
                    }
                    dataIndex += 4;
                }
            }

            document.dispatchEvent(new CustomEvent(EVENTS.loadState, { detail: newColorData }));

            utils.showSuccess(this.ui.btnUpload.querySelector('.icon'));
            URL.revokeObjectURL(imageUrl);
        };

        img.onerror = () => {
            console.error('Error loading the image.');
        }
        img.src = imageUrl;
    },

    getSVGPreview: function (colorData) {
        const gridSize = colorData.length;
        const svg = document.createElementNS(this.svgns, 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('viewBox', `0 0 ${gridSize} ${gridSize}`);
        svg.setAttribute('shape-rendering', 'crispEdges');
        svg.setAttribute('data-pixel-art', 'true');

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
                pathData += `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}Z `;
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
        this.ui.svgContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    needsSvgReset: false,
    gridRect: null,
    lastTool: null,
    lastX: null,
    lastY: null,
    dragSnapshot: null,
    dragStartX: null,
    dragStartY: null,
    colorData: null,
    domCache: [],

    init: function () {
        this.cacheDOM();
        this.initColorData();
        this.buildDOMCache();
        this.bindEvents();
    },

    cacheDOM: function () {
        this.ui.gridContainer = document.querySelector('.grid-container');
    },

    initColorData: function () {
        this.colorData = this.createEmptyGrid();
    },

    buildDOMCache: function () {
        const size = gridSizeManager.getGridSize();
        this.domCache = new Array(size);
        const rows = this.ui.gridContainer.children;
        for (let y = 0; y < size; y++) {
            this.domCache[y] = Array.from(rows[y].children);
        }
    },

    getColorData: function () {
        return this.colorData;
    },

    bindEvents: function () {
        this.ui.gridContainer.addEventListener('contextmenu', e => e.preventDefault());
        this.ui.gridContainer.addEventListener('pointerdown', e => this.handlePointerDown(e));
        this.ui.gridContainer.addEventListener('pointermove', e => this.handlePointerMove(e));
        document.addEventListener('pointerup', e => this.stopDrawing());
        document.addEventListener('pointercancel', e => this.stopDrawing());

        document.addEventListener(EVENTS.gridSizeChanged, () => this.handleGridSizeChange());
        document.addEventListener(EVENTS.clearCanvas, () => this.clearCanvas());
        document.addEventListener(EVENTS.toggleGridLines, () => this.ui.gridContainer.classList.toggle('grid-active'));

        document.addEventListener(EVENTS.loadState, e => this.loadFromData(e.detail));
        document.addEventListener(EVENTS.restoreHistoryState, e => this.loadFromData(e.detail));

        document.addEventListener(EVENTS.rotateCanvas, () => this.rotate());
        document.addEventListener(EVENTS.mirrorCanvas, () => this.mirror());
        document.addEventListener(EVENTS.toggleMirrorY, e => this.ui.gridContainer.classList.toggle('mirror-y', e.detail));
        document.addEventListener(EVENTS.toggleMirrorX, e => this.ui.gridContainer.classList.toggle('mirror-x', e.detail));
        document.addEventListener(EVENTS.fillBackground, () => this.fillBackground());
    },

    handlePointerDown: function (e) {
        e.preventDefault();
        if (this.active) return;

        this.gridRect = this.ui.gridContainer.getBoundingClientRect();
        this.ui.gridContainer.setPointerCapture(e.pointerId);

        if (e.button === 1 || e.button === 2) {
            if (!this.lastTool) this.lastTool = toolbarManager.getActiveTool();
            const newTool = e.button === 1 ? 'move' : this.lastTool === 'erase' ? 'draw' : 'erase';
            toolbarManager.setActiveTool(newTool);
        }

        this.active = true;
        this.hasChanged = false;

        const coords = this.getGridCoordinates(e);
        this.lastX = coords.x;
        this.lastY = coords.y;

        const activeTool = toolbarManager.getActiveTool();

        if (activeTool === 'move') {
            this.dragSnapshot = this.colorData.map(row => [...row]);
            this.dragStartX = this.lastX;
            this.dragStartY = this.lastY;
        } else {
            this.applyTool(this.lastX, this.lastY, activeTool);
        }
    },

    handlePointerMove: function (e) {
        if (!this.active) return;
        if (e.buttons === 0) {
            this.stopDrawing();
            return;
        }

        const activeTool = toolbarManager.getActiveTool();

        if (activeTool === 'move' || activeTool === 'fill') {
            const coords = this.getGridCoordinates(e);
            if (this.lastX === coords.x && this.lastY === coords.y) return;

            if (activeTool === 'move') {
                const dx = coords.x - this.dragStartX;
                const dy = coords.y - this.dragStartY;
                this.move(dx, dy);
            } else {
                this.fill(coords.x, coords.y);
            }
            this.lastX = coords.x;
            this.lastY = coords.y;
        } else {
            const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];

            for (let i = 0; i < events.length; i++) {
                const coords = this.getGridCoordinates(events[i]);
                if (this.lastX === coords.x && this.lastY === coords.y) return;

                this.drawLine(this.lastX, this.lastY, coords.x, coords.y);
                this.lastX = coords.x;
                this.lastY = coords.y;
            }
        }
    },

    handleGridSizeChange: function () {
        const newSize = gridSizeManager.getGridSize();
        const oldData = this.colorData;
        const oldSize = oldData.length;
        const isScale = gridSizeManager.ui.btnScale.classList.contains('active');

        this.colorData = Array.from({ length: newSize }, (_, y) =>
            Array.from({ length: newSize }, (_, x) => {
                if (isScale) {
                    const oldX = Math.floor(x * (oldSize / newSize));
                    const oldY = Math.floor(y * (oldSize / newSize));
                    return (oldData[oldY] && oldData[oldY][oldX]) ? oldData[oldY][oldX] : '';

                } else {
                    return (oldData[y] && oldData[y][x]) ? oldData[y][x] : '';
                }
            }));

        this.buildDOMCache();
        this.renderAllPixels();
    },

    stopDrawing: function () {
        if (!this.active) return;
        if (this.hasChanged) document.dispatchEvent(new CustomEvent(EVENTS.saveHistory));
        if (this.needsSvgReset) {
            document.dispatchEvent(new CustomEvent(EVENTS.pixelChanged));
            this.needsSvgReset = false;
        }

        this.active = false;
        this.hasChanged = false;
        this.lastX = null;
        this.lastY = null;
        this.dragSnapshot = null;
        this.gridRect = null;

        if (this.lastTool) {
            toolbarManager.setActiveTool(this.lastTool);
            this.lastTool = null;
        }
    },

    getGridCoordinates: function (e) {
        const rect = this.gridRect || this.ui.gridContainer.getBoundingClientRect();
        const size = gridSizeManager.getGridSize();

        let x = Math.floor(((e.clientX - rect.left) / rect.width) * size);
        let y = Math.floor(((e.clientY - rect.top) / rect.height) * size);

        x = Math.max(0, Math.min(size - 1, x));
        y = Math.max(0, Math.min(size - 1, y));
        return { x, y };
    },

    updateColorData: function (x, y, color = '') {
        const compressedColor = utils.compressColor(color);

        if (this.colorData[y][x] !== compressedColor) {
            this.colorData[y][x] = compressedColor;
            this.hasChanged = true;
            this.needsSvgReset = true;
            return true;
        }
        return false;
    },

    loadFromData: function (newColorData) {
        const newSize = newColorData.length;

        if (gridSizeManager.getGridSize() !== newSize) {
            gridSizeManager.gridSize = newSize;
            gridSizeManager.ui.gridSizeSpan.textContent = `${newSize} x ${newSize}`;
            gridSizeManager.createGrid();
            this.buildDOMCache();
        }

        this.colorData = newColorData.map(row => [...row]);
        this.renderAllPixels();
        document.dispatchEvent(new CustomEvent(EVENTS.canvasRebuilt, { detail: this.colorData }));
    },

    renderAllPixels: function () {
        const size = this.colorData.length;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = this.domCache[y] && this.domCache[y][x];
                if (cell) cell.style.backgroundColor = this.colorData[y][x];
            }
        }
    },

    clearCanvas: function () {
        this.initColorData();
        this.renderAllPixels();
    },

    createEmptyGrid: function (size = gridSizeManager.getGridSize()) {
        return Array.from({ length: size }, () => new Array(size).fill(''));
    },

    applyTool: function (x, y, toolName) {
        if (toolName === 'picker') {
            this.picker(x, y);
            return;
        }

        const size = gridSizeManager.getGridSize();
        const mirrorX = size - 1 - x;
        const mirrorY = size - 1 - y;

        this[toolName](x, y);

        if (toolbarManager.isMirrorX && mirrorY !== y) this[toolName](x, mirrorY);
        if (toolbarManager.isMirrorY && mirrorX !== x) this[toolName](mirrorX, y);
        if (toolbarManager.isMirrorX && toolbarManager.isMirrorY && mirrorX !== x && mirrorY !== y) {
            this[toolName](mirrorX, mirrorY);
        }
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
                this.applyTool(x0, y0, toolbarManager.getActiveTool());
            }
            isFirstPixel = false;

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    },

    setPixelColor: function (x, y, color) {
        if (this.updateColorData(x, y, color)) {
            if (this.domCache[y] && this.domCache[y][x]) {
                this.domCache[y][x].style.backgroundColor = color;
            }
        }
    },

    draw: function (x, y) {
        this.setPixelColor(x, y, toolbarManager.getColor());
    },

    erase: function (x, y) {
        this.setPixelColor(x, y, '');
    },

    darken: function (x, y) {
        const currentColor = this.colorData[y][x];
        if (!currentColor || currentColor === '#000' || currentColor === '#000000') return;
        this.setPixelColor(x, y, utils.adjustColor(currentColor, -CONFIG.shadeStep));
    },

    brighten: function (x, y) {
        const currentColor = this.colorData[y][x];
        if (!currentColor || currentColor === '#fff' || currentColor === '#ffffff') return;
        this.setPixelColor(x, y, utils.adjustColor(currentColor, CONFIG.shadeStep));
    },

    rainbow: function (x, y) {
        const randomHex = utils.rgbToHex(
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256)
        );
        toolbarManager.onColorChange(randomHex, true);
        this.draw(x, y);
    },

    picker: function (x, y) {
        let color = this.colorData[y][x];
        if (color === '') color = '#ffffff';
        toolbarManager.onColorChange(utils.decompressColor(color));
        const previousTool = toolbarManager.getPreviousTool();
        toolbarManager.setActiveTool(previousTool === 'fill' ? 'fill' : 'draw');
    },

    move: function (dx, dy) {
        const size = gridSizeManager.getGridSize();
        const newColorData = this.createEmptyGrid();

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const color = this.dragSnapshot[y][x];
                if (color) {
                    const newX = ((x + dx) % size + size) % size;
                    const newY = ((y + dy) % size + size) % size;
                    newColorData[newY][newX] = color;
                }
            }
        }
        this.hasChanged = (dx % size !== 0 || dy % size !== 0);
        this.loadFromData(newColorData);
    },

    fill: function (startX, startY) {
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

                const cell = this.domCache[y] && this.domCache[y][x];
                if (cell) cell.style.backgroundColor = replacementColor;

                for (let i = 0; i < directions.length; i++) {
                    stack.push([x + directions[i][0], y + directions[i][1]]);
                }
            }
        }
        document.dispatchEvent(new CustomEvent(EVENTS.canvasRebuilt, { detail: this.colorData }));
    },

    fillBackground: function () {
        const pickedColor = toolbarManager.getColor();
        let backgroundChanged = false;
        const size = gridSizeManager.getGridSize();
        const newColorData = this.colorData.map(row => [...row]);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (newColorData[y][x] === '') {
                    newColorData[y][x] = pickedColor;
                    backgroundChanged = true;
                }
            }
        }
        if (backgroundChanged) {
            this.loadFromData(newColorData);
            document.dispatchEvent(new CustomEvent(EVENTS.saveHistory));
        }
    },

    rotate: function () {
        const size = gridSizeManager.getGridSize();
        const newColorData = this.createEmptyGrid();
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                newColorData[x][size - 1 - y] = this.colorData[y][x];
            }
        }
        this.loadFromData(newColorData);
        document.dispatchEvent(new CustomEvent(EVENTS.saveHistory));
    },

    mirror: function () {
        const newColorData = this.colorData.map(row => [...row].reverse());
        this.loadFromData(newColorData);
        document.dispatchEvent(new CustomEvent(EVENTS.saveHistory));
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
        document.addEventListener(EVENTS.undoAction, () => this.undo());
        document.addEventListener(EVENTS.redoAction, () => this.redo());
        document.addEventListener(EVENTS.saveHistory, () => this.saveState());

        document.addEventListener(EVENTS.clearCanvas, () => {
            setTimeout(() => this.saveState(), 10);
        });

        document.addEventListener(EVENTS.gridSizeChanged, () => {
            setTimeout(() => this.saveState(), 10);
        });

        document.addEventListener(EVENTS.loadState, () => this.resetHistory());
    },

    saveState: function () {
        const currentState = drawManager.getColorData().map(row => [...row]);
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
        document.dispatchEvent(new CustomEvent(EVENTS.restoreHistoryState, { detail: previousState }));
    },

    redo: function () {
        if (this.redoStack.length === 0) return;

        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);
        document.dispatchEvent(new CustomEvent(EVENTS.restoreHistoryState, { detail: nextState }));
    },

    resetHistory: function () {
        this.undoStack = [];
        this.redoStack = [];
        this.saveState();
    },
};

historyManager.init();

const scrollManager = {
    ui: {},

    init: function () {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function () {
        this.ui.sliders = document.querySelectorAll('.toolbar, .actionbar');
    },

    bindEvents: function () {
        this.ui.sliders.forEach(slider => {
            this.initDragToScroll(slider);
            this.initScrollButtons(slider);
        });
    },

    initDragToScroll: function (slider) {
        let isDown = false;
        let startX = null;
        let scrollLeft = null;
        let hasDragged = false;

        const stopScrollHandling = () => {
            if (!isDown) return;
            isDown = false;
            document.body.classList.remove('grabbing');
        };

        slider.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            isDown = true;
            hasDragged = false;
            document.body.classList.add('grabbing');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });

        window.addEventListener('mousemove', e => {
            if (!isDown) return;
            if (e.buttons !== 1) {
                stopScrollHandling();
                return;
            }

            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = x - startX;
            if (Math.abs(walk) > CONFIG.scrollTolerance) hasDragged = true;
            slider.scrollLeft = scrollLeft - walk;
        });

        window.addEventListener('mouseup', () => stopScrollHandling());

        slider.addEventListener('click', e => {
            if (hasDragged) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    },

    initScrollButtons: function (slider) {
        const wrapper = slider.closest('.scroll-wrapper');
        if (!wrapper) return;

        const btnLeft = wrapper.querySelector('.scroll-btn.left');
        const btnRight = wrapper.querySelector('.scroll-btn.right');

        const updateButtons = () => {
            const maxScroll = slider.scrollWidth - slider.clientWidth;
            if (btnLeft) btnLeft.style.display = slider.scrollLeft > CONFIG.scrollTolerance ? 'flex' : 'none';
            if (btnRight) btnRight.style.display = slider.scrollLeft < maxScroll - CONFIG.scrollTolerance ? 'flex' : 'none';
        };

        const scroll = (factor) => {
            const { clientWidth, scrollWidth, scrollLeft } = slider;
            const maxScroll = scrollWidth - clientWidth;
            const scrollAmount = Math.round(clientWidth * 0.8);
            const snapThreshold = Math.round(clientWidth * 0.18);
            const distanceToEdge = factor > 0 ? maxScroll - scrollLeft : scrollLeft;
            const remainingAfterScroll = distanceToEdge - scrollAmount;
            const scrollDist = remainingAfterScroll <= snapThreshold ? distanceToEdge : scrollAmount;
            slider.scrollBy({ left: scrollDist * factor, behavior: 'smooth' });
        };

        if (btnLeft) btnLeft.addEventListener('click', () => scroll(-1));
        if (btnRight) btnRight.addEventListener('click', () => scroll(1));

        slider.addEventListener('scroll', updateButtons);
        window.addEventListener('resize', updateButtons);
        setTimeout(updateButtons, 100);
    },
};

scrollManager.init();

const hintManager = {
    ui: {},
    tips: [
        "Pro tip: Hold down Undo ('Ctrl+Z') or Redo ('Ctrl+Y') to travel through time faster.",
        "Did you know? You can drag & drop PNGs, JPGs, WEBPs or SVGs directly onto the canvas!",
        "The data-pixel-art='true' attribute allows the viewBox dimensions to be automatically set as the canvas scale.",
        "Hold down the + or - buttons to rapidly change the grid size.",
        "Toggle the Scale button ('s') to resize your artwork instead of just the canvas.",
        "Use keyboard shortcuts like 'Ctrl+Z' (Undo) and 'Ctrl+S' (Save) to speed up your workflow.",
        "Right-click anywhere on the canvas to quickly swap between the Draw and Erase tools.",
        "Press 'F' for the Fill tool, or 'P' for the Color Picker. Use keyboard shortcuts to be faster!",
        "Try the Rainbow tool (press 'R') to draw with a new random color for every pixel.",
        "Use the Darken ('K') and Brighten ('L') tools to add shading and highlights.",
        "Press 'X' or 'Y' to toggle symmetry mode and draw mirrored shapes.",
        "Need to move your art? Select the Move tool ('M') or click your scroll wheel to drag your drawing around.",
    ],
    currentIndex: 0,
    intervalId: null,
    fadeTimeoutId: null,
    typewriterTimeoutId: null,

    init: function () {
        this.cacheDOM();
        this.bindEvents();

        if (localStorage.getItem('hintsDismissed') !== 'true') {
            this.ui.hintContainer.style.display = 'flex';
            this.ui.btnShow.classList.add('hide-down');
            this.startRotation();
        }
        void this.ui.btnShow.offsetHeight;
        this.ui.btnShow.classList.add('ready');
    },

    cacheDOM: function () {
        this.ui.hintContainer = document.querySelector('.hint-container');
        this.ui.hintText = document.querySelector('.hint-text');
        this.ui.btnClose = document.querySelector('.hint-close');
        this.ui.btnShow = document.querySelector('.hint-show');
    },

    bindEvents: function () {
        this.ui.btnClose.addEventListener('click', () => this.toggleHints());
        this.ui.btnShow.addEventListener('click', () => this.toggleHints());
        document.addEventListener(EVENTS.toggleHints, () => this.toggleHints());
    },

    toggleHints: function () {
        if (this.fadeTimeoutId) {
            clearTimeout(this.fadeTimeoutId);
            this.fadeTimeoutId = null;
        }
        const showHint = localStorage.getItem('hintsDismissed') === 'true';
        if (showHint) {
            localStorage.removeItem('hintsDismissed');
            this.ui.btnShow.classList.add('hide-down');
            this.ui.hintContainer.style.opacity = '0';
            this.ui.hintContainer.style.display = 'flex';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.ui.hintContainer.style.opacity = '';
                });
            });
            this.startRotation();
        } else {
            localStorage.setItem('hintsDismissed', 'true');
            this.ui.hintContainer.style.opacity = '0';
            if (this.intervalId) clearInterval(this.intervalId);
            if (this.typewriterTimeoutId) clearTimeout(this.typewriterTimeoutId);
            this.fadeTimeoutId = setTimeout(() => {
                this.ui.hintContainer.style.display = 'none';
                this.ui.btnShow.classList.remove('hide-down');
                this.fadeTimeoutId = null;
            }, 300);
        }
    },

    startRotation: function () {
        if (this.intervalId) clearInterval(this.intervalId);
        this.typeText(this.tips[this.currentIndex])
        this.intervalId = setInterval(() => {
            this.ui.hintText.style.opacity = '0';
            setTimeout(() => {
                this.currentIndex = (this.currentIndex + 1) % this.tips.length;
                this.ui.hintText.style.opacity = '';
                this.typeText(this.tips[this.currentIndex])
            }, 300);
        }, 10000);
    },

    typeText: function (fullText) {
        if (this.typewriterTimeoutId) clearTimeout(this.typewriterTimeoutId);
        this.ui.hintText.textContent = '';
        let charIndex = 0;
        const type = () => {
            if (charIndex < fullText.length) {
                this.ui.hintText.textContent += fullText.charAt(charIndex);
                charIndex++;
                const randomSpeed = Math.floor(Math.random() * 20) + 20;
                this.typewriterTimeoutId = setTimeout(type, randomSpeed);
            } else {
                this.typewriterTimeoutId = null;
            }
        };
        type();
    },
};

hintManager.init();