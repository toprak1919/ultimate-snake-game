// ===== GAME BOY ACCESSORIES SYSTEM =====

/**
 * Game Boy Snake Accessory System
 * Adds physical Game Boy accessory emulation including:
 * - Game Boy Camera (minimap accessory)
 * - Game Boy Printer (screenshot/score printer)
 * - Game Boy Link Cable (ghost multiplayer)
 * - Battery Pack (extra game features)
 */

// Accessory definitions
const ACCESSORIES = {
    CAMERA: {
        name: "SNAKE CAMERA",
        description: "View the entire game map",
        logo: `
        ┌───────────┐
        │ SNAKE CAM │
        │  ┌─────┐  │
        │  │  O  │  │
        │  └─────┘  │
        └───────────┘`,
        enabled: false
    },
    PRINTER: {
        name: "SNAKE PRINTER",
        description: "Print your scores",
        logo: `
        ┌───────────┐
        │SNAKE PRINT│
        │ ┌───────┐ │
        │ │[][][]│ │
        │ └───────┘ │
        └───────────┘`,
        enabled: false
    },
    LINK_CABLE: {
        name: "SNAKE LINK",
        description: "Ghost multiplayer mode",
        logo: `
        ┌───────────┐
        │ SNAKE LINK│
        │  ╔═════╗  │
        │  ║  =  ║  │
        │  ╚═════╝  │
        └───────────┘`,
        enabled: false
    },
    BATTERY_PACK: {
        name: "SNAKE POWER",
        description: "Unlock special features",
        logo: `
        ┌───────────┐
        │SNAKE POWER│
        │ ┌───────┐ │
        │ │[+++++]│ │
        │ └───────┘ │
        └───────────┘`,
        enabled: false
    }
};

// Additional game constants
const ACCESSORY_CONFIG = {
    // Camera (minimap) settings
    CAMERA: {
        UPDATE_INTERVAL: 500, // ms between map updates
        PIXEL_SIZE: 2,        // size of each map pixel
        PHOTO_COUNT: 5,       // maximum stored photos
        BATTERIES: 20         // battery life (turns)
    },
    
    // Printer settings
    PRINTER: {
        PRINT_TIME: 3000,     // ms to "print" a screenshot
        PAPER_COUNT: 3,       // number of available papers
        INK_LEVEL: 10,        // number of prints before ink runs out
        PRINT_LINES: 20       // lines printed per screenshot
    },
    
    // Link Cable settings
    LINK_CABLE: {
        GHOST_COUNT: 3,       // number of ghost snakes
        SYNC_INTERVAL: 2000,  // ms between ghost updates
        DATA_PACKETS: 10,     // visual data packet count
        CABLE_LENGTH: 200     // visual cable length in pixels
    },
    
    // Battery Pack settings
    BATTERY_PACK: {
        INITIAL_CHARGE: 100,  // starting battery percentage
        DRAIN_RATE: 0.2,      // percentage drain per second
        LOW_BATTERY: 20,      // percentage when "low battery" warning shows
        CHARGE_RATE: 10       // percentage gained from power-ups
    }
};

// Game Boy Camera Extension
class GameBoyCamera {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.batteries = ACCESSORY_CONFIG.CAMERA.BATTERIES;
        this.lastUpdate = 0;
        this.photos = [];
        this.viewMode = 'map'; // 'map' or 'photos'
        this.currentPhotoIndex = 0;
        
        // Create camera UI
        this.createCameraUI();
    }
    
    createCameraUI() {
        // Create the camera container
        const camera = document.createElement('div');
        camera.id = 'gbCamera';
        camera.className = 'gb-accessory gb-camera';
        
        // Add connection visual to Game Boy
        const connection = document.createElement('div');
        connection.className = 'accessory-connection';
        connection.innerHTML = `
            <div class="connection-pins">
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
            </div>
        `;
        
        // Create camera body
        const cameraBody = document.createElement('div');
        cameraBody.className = 'camera-body';
        cameraBody.innerHTML = `
            <div class="camera-header">
                <div class="camera-logo">SNAKE CAMERA</div>
                <div class="camera-battery">
                    <div class="battery-level" id="cameraBattery"></div>
                </div>
            </div>
            <div class="camera-screen" id="cameraScreen">
                <canvas id="cameraCanvas" width="64" height="64"></canvas>
            </div>
            <div class="camera-controls">
                <button class="camera-btn" id="cameraToggle">ON/OFF</button>
                <button class="camera-btn" id="cameraMode">MODE</button>
                <button class="camera-btn" id="cameraCapture">SNAP</button>
            </div>
        `;
        
        // Assemble camera
        camera.appendChild(connection);
        camera.appendChild(cameraBody);
        
        // Add to body
        document.body.appendChild(camera);
        
        // Add event listeners
        document.getElementById('cameraToggle').addEventListener('click', () => this.toggleCamera());
        document.getElementById('cameraMode').addEventListener('click', () => this.toggleMode());
        document.getElementById('cameraCapture').addEventListener('click', () => this.takePhoto());
        
        // Initialize camera canvas
        this.cameraCanvas = document.getElementById('cameraCanvas');
        this.cameraCtx = this.cameraCanvas.getContext('2d');
    }
    
    toggleCamera() {
        // Toggle camera on/off
        this.enabled = !this.enabled;
        
        // Update UI
        if (this.enabled) {
            document.getElementById('gbCamera').classList.add('accessory-enabled');
            if (window.gbSound) window.gbSound.play('powerup');
        } else {
            document.getElementById('gbCamera').classList.remove('accessory-enabled');
            if (window.gbSound) window.gbSound.play('button');
        }
        
        // Display status
        this.game.showNotification(this.enabled ? "CAMERA ON" : "CAMERA OFF");
    }
    
    toggleMode() {
        // Toggle between map view and photo view
        this.viewMode = this.viewMode === 'map' ? 'photos' : 'map';
        
        // Play sound
        if (window.gbSound) window.gbSound.play('button');
        
        // Reset photo index when entering photo mode
        if (this.viewMode === 'photos') {
            this.currentPhotoIndex = 0;
        }
        
        // Display status
        this.game.showNotification(this.viewMode === 'map' ? "MAP VIEW" : "PHOTO VIEW");
    }
    
    takePhoto() {
        // Only take photo if camera is on and in game state
        if (!this.enabled || this.game.state !== GAME_STATE.PLAYING) return;
        
        // Check battery
        if (this.batteries <= 0) {
            this.game.showNotification("NO BATTERY!");
            if (window.gbSound) window.gbSound.play('hit');
            return;
        }
        
        // Consume battery
        this.batteries--;
        this.updateBatteryDisplay();
        
        // Take photo (copy of current game state)
        const photo = {
            grid: JSON.parse(JSON.stringify(this.game.grid)),
            snake: JSON.parse(JSON.stringify(this.game.snake)),
            food: this.game.food ? {...this.game.food} : null,
            powerUp: this.game.powerUp ? {...this.game.powerUp} : null,
            obstacles: this.game.obstacles ? [...this.game.obstacles] : [],
            portals: this.game.portals ? [...this.game.portals] : [],
            timestamp: new Date().toLocaleTimeString(),
            score: this.game.score
        };
        
        // Add to photos array (limit to max count)
        this.photos.unshift(photo);
        if (this.photos.length > ACCESSORY_CONFIG.CAMERA.PHOTO_COUNT) {
            this.photos.pop();
        }
        
        // Switch to photo view
        this.viewMode = 'photos';
        this.currentPhotoIndex = 0;
        
        // Camera shutter sound and flash
        if (window.gbSound) window.gbSound.play('camera');
        this.flashEffect();
        
        // Notification
        this.game.showNotification("PHOTO TAKEN!");
    }
    
    updateBatteryDisplay() {
        // Update battery indicator
        const batteryEl = document.getElementById('cameraBattery');
        if (batteryEl) {
            const percentage = (this.batteries / ACCESSORY_CONFIG.CAMERA.BATTERIES) * 100;
            batteryEl.style.width = `${percentage}%`;
            
            // Change color when low
            if (percentage < 20) {
                batteryEl.classList.add('battery-low');
            } else {
                batteryEl.classList.remove('battery-low');
            }
        }
    }
    
    flashEffect() {
        // Create flash overlay
        const flash = document.createElement('div');
        flash.className = 'camera-flash';
        document.getElementById('cameraScreen').appendChild(flash);
        
        // Remove after animation
        setTimeout(() => {
            flash.remove();
        }, 300);
    }
    
    update(timestamp) {
        // Only update if camera is on
        if (!this.enabled) return;
        
        // Update minimap at regular intervals to save processing
        if (timestamp - this.lastUpdate > ACCESSORY_CONFIG.CAMERA.UPDATE_INTERVAL) {
            this.lastUpdate = timestamp;
            this.render();
        }
    }
    
    render() {
        // Clear canvas
        this.cameraCtx.fillStyle = '#9bbc0f';
        this.cameraCtx.fillRect(0, 0, this.cameraCanvas.width, this.cameraCanvas.height);
        
        if (this.viewMode === 'map') {
            // Draw minimap
            this.renderMinimap();
        } else {
            // Draw photos
            this.renderPhoto();
        }
    }
    
    renderMinimap() {
        // Only render minimap in playing state
        if (this.game.state !== GAME_STATE.PLAYING) {
            this.renderNoSignal();
            return;
        }
        
        const pixelSize = ACCESSORY_CONFIG.CAMERA.PIXEL_SIZE;
        const gridSize = this.game.grid.length;
        
        // Draw grid
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const cellType = this.game.grid[y][x];
                let color = '#9bbc0f'; // Default background
                
                // Set color based on cell type
                switch (cellType) {
                    case TILE.SNAKE_HEAD:
                        color = '#0f380f'; // Dark for head
                        break;
                    case TILE.SNAKE_BODY:
                        color = '#306230'; // Medium for body
                        break;
                    case TILE.FOOD:
                        color = '#0f380f'; // Dark for food
                        break;
                    case TILE.POWER_UP:
                    case TILE.SPECIAL_FOOD:
                        color = '#306230'; // Medium for power-ups
                        break;
                    case TILE.OBSTACLE:
                        color = '#0f380f'; // Dark for obstacles
                        break;
                    case TILE.PORTAL_ENTRANCE:
                    case TILE.PORTAL_EXIT:
                        color = '#306230'; // Medium for portals
                        break;
                }
                
                // Draw pixel
                this.cameraCtx.fillStyle = color;
                this.cameraCtx.fillRect(
                    x * pixelSize, 
                    y * pixelSize, 
                    pixelSize, 
                    pixelSize
                );
            }
        }
        
        // Add camera viewfinder
        this.drawViewfinder();
    }
    
    renderPhoto() {
        // Check if we have photos
        if (this.photos.length === 0) {
            this.renderNoPhotos();
            return;
        }
        
        // Get current photo
        const photo = this.photos[this.currentPhotoIndex];
        
        // Draw photo metadata
        this.cameraCtx.fillStyle = '#0f380f';
        this.cameraCtx.font = '6px monospace';
        this.cameraCtx.fillText(`SCORE: ${photo.score}`, 5, 8);
        this.cameraCtx.fillText(`TIME: ${photo.timestamp}`, 5, 16);
        this.cameraCtx.fillText(`#${this.currentPhotoIndex + 1}/${this.photos.length}`, 5, 60);
        
        // Draw photo content (minimap style)
        const pixelSize = ACCESSORY_CONFIG.CAMERA.PIXEL_SIZE;
        const gridSize = photo.grid.length;
        
        // Draw grid from photo data
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const cellType = photo.grid[y][x];
                let color = '#9bbc0f'; // Default background
                
                // Set color based on cell type (same as minimap)
                switch (cellType) {
                    case TILE.SNAKE_HEAD:
                        color = '#0f380f';
                        break;
                    case TILE.SNAKE_BODY:
                        color = '#306230';
                        break;
                    case TILE.FOOD:
                        color = '#0f380f';
                        break;
                    case TILE.POWER_UP:
                    case TILE.SPECIAL_FOOD:
                        color = '#306230';
                        break;
                    case TILE.OBSTACLE:
                        color = '#0f380f';
                        break;
                    case TILE.PORTAL_ENTRANCE:
                    case TILE.PORTAL_EXIT:
                        color = '#306230';
                        break;
                }
                
                // Draw pixel
                this.cameraCtx.fillStyle = color;
                this.cameraCtx.fillRect(
                    x * pixelSize + 10, // offset to make room for text
                    y * pixelSize + 20, // offset below text
                    pixelSize, 
                    pixelSize
                );
            }
        }
        
        // Add photo frame
        this.drawPhotoFrame();
    }
    
    drawViewfinder() {
        // Draw camera viewfinder elements
        this.cameraCtx.strokeStyle = '#0f380f';
        this.cameraCtx.lineWidth = 1;
        
        // Draw corner brackets
        const size = 5;
        const margin = 3;
        
        // Top left
        this.cameraCtx.beginPath();
        this.cameraCtx.moveTo(margin, margin + size);
        this.cameraCtx.lineTo(margin, margin);
        this.cameraCtx.lineTo(margin + size, margin);
        this.cameraCtx.stroke();
        
        // Top right
        this.cameraCtx.beginPath();
        this.cameraCtx.moveTo(this.cameraCanvas.width - margin, margin + size);
        this.cameraCtx.lineTo(this.cameraCanvas.width - margin, margin);
        this.cameraCtx.lineTo(this.cameraCanvas.width - margin - size, margin);
        this.cameraCtx.stroke();
        
        // Bottom left
        this.cameraCtx.beginPath();
        this.cameraCtx.moveTo(margin, this.cameraCanvas.height - margin - size);
        this.cameraCtx.lineTo(margin, this.cameraCanvas.height - margin);
        this.cameraCtx.lineTo(margin + size, this.cameraCanvas.height - margin);
        this.cameraCtx.stroke();
        
        // Bottom right
        this.cameraCtx.beginPath();
        this.cameraCtx.moveTo(this.cameraCanvas.width - margin, this.cameraCanvas.height - margin - size);
        this.cameraCtx.lineTo(this.cameraCanvas.width - margin, this.cameraCanvas.height - margin);
        this.cameraCtx.lineTo(this.cameraCanvas.width - margin - size, this.cameraCanvas.height - margin);
        this.cameraCtx.stroke();
        
        // Draw center crosshair
        this.cameraCtx.beginPath();
        this.cameraCtx.moveTo(this.cameraCanvas.width/2 - 3, this.cameraCanvas.height/2);
        this.cameraCtx.lineTo(this.cameraCanvas.width/2 + 3, this.cameraCanvas.height/2);
        this.cameraCtx.moveTo(this.cameraCanvas.width/2, this.cameraCanvas.height/2 - 3);
        this.cameraCtx.lineTo(this.cameraCanvas.width/2, this.cameraCanvas.height/2 + 3);
        this.cameraCtx.stroke();
    }
    
    drawPhotoFrame() {
        // Draw decorative frame around photo
        this.cameraCtx.strokeStyle = '#0f380f';
        this.cameraCtx.lineWidth = 2;
        this.cameraCtx.strokeRect(2, 2, this.cameraCanvas.width - 4, this.cameraCanvas.height - 4);
        
        // Draw film sprocket holes
        this.cameraCtx.fillStyle = '#0f380f';
        for (let i = 1; i < 5; i++) {
            this.cameraCtx.fillRect(
                2, 
                i * (this.cameraCanvas.height / 5), 
                3, 
                2
            );
            this.cameraCtx.fillRect(
                this.cameraCanvas.width - 5, 
                i * (this.cameraCanvas.height / 5), 
                3, 
                2
            );
        }
        
        // Draw capture date indicator dots
        this.cameraCtx.fillStyle = '#0f380f';
        for (let i = 0; i < this.photos.length; i++) {
            const dotSize = i === this.currentPhotoIndex ? 3 : 2;
            this.cameraCtx.fillRect(
                10 + i * 10, 
                this.cameraCanvas.height - 4, 
                dotSize, 
                dotSize
            );
        }
    }
    
    renderNoSignal() {
        // Draw "no signal" pattern
        this.cameraCtx.fillStyle = '#0f380f';
        this.cameraCtx.font = '10px "Press Start 2P"';
        this.cameraCtx.textAlign = 'center';
        this.cameraCtx.fillText('NO SIGNAL', this.cameraCanvas.width/2, this.cameraCanvas.height/2 - 10);
        
        // Draw static noise
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.cameraCanvas.width;
            const y = Math.random() * this.cameraCanvas.height;
            const size = Math.random() * 3 + 1;
            
            this.cameraCtx.fillRect(x, y, size, size);
        }
    }
    
    renderNoPhotos() {
        // Draw "no photos" message
        this.cameraCtx.fillStyle = '#0f380f';
        this.cameraCtx.font = '8px "Press Start 2P"';
        this.cameraCtx.textAlign = 'center';
        this.cameraCtx.fillText('NO PHOTOS', this.cameraCanvas.width/2, this.cameraCanvas.height/2 - 10);
        this.cameraCtx.fillText('TAKE A PHOTO', this.cameraCanvas.width/2, this.cameraCanvas.height/2 + 10);
        this.cameraCtx.fillText('WITH SNAP BTN', this.cameraCanvas.width/2, this.cameraCanvas.height/2 + 25);
    }
    
    browsePhotos(direction) {
        // Only work in photo mode with photos
        if (this.viewMode !== 'photos' || this.photos.length === 0) return;
        
        // Change photo index
        if (direction === 'next') {
            this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.photos.length;
        } else {
            this.currentPhotoIndex = (this.currentPhotoIndex - 1 + this.photos.length) % this.photos.length;
        }
        
        // Render immediately
        this.render();
        
        // Play sound
        if (window.gbSound) window.gbSound.play('button');
    }
    
    deleteCurrentPhoto() {
        // Only work in photo mode with photos
        if (this.viewMode !== 'photos' || this.photos.length === 0) return;
        
        // Remove current photo
        this.photos.splice(this.currentPhotoIndex, 1);
        
        // Adjust index if needed
        if (this.currentPhotoIndex >= this.photos.length) {
            this.currentPhotoIndex = Math.max(0, this.photos.length - 1);
        }
        
        // Render immediately
        this.render();
        
        // Play sound
        if (window.gbSound) window.gbSound.play('hit');
        
        // Notification
        this.game.showNotification("PHOTO DELETED");
    }
}

// Game Boy Printer Extension
class GameBoyPrinter {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.printing = false;
        this.paperCount = ACCESSORY_CONFIG.PRINTER.PAPER_COUNT;
        this.inkLevel = ACCESSORY_CONFIG.PRINTER.INK_LEVEL;
        this.printQueue = [];
        this.printHistory = [];
        
        // Create printer UI
        this.createPrinterUI();
    }
    
    createPrinterUI() {
        // Create the printer container
        const printer = document.createElement('div');
        printer.id = 'gbPrinter';
        printer.className = 'gb-accessory gb-printer';
        
        // Add connection visual to Game Boy
        const connection = document.createElement('div');
        connection.className = 'accessory-connection';
        connection.innerHTML = `
            <div class="connection-pins">
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
            </div>
        `;
        
        // Create printer body
        const printerBody = document.createElement('div');
        printerBody.className = 'printer-body';
        printerBody.innerHTML = `
            <div class="printer-header">
                <div class="printer-logo">SNAKE PRINTER</div>
                <div class="printer-status">
                    <div class="ink-level">
                        <span>INK:</span>
                        <div class="ink-bar" id="printerInk"></div>
                    </div>
                    <div class="paper-count">
                        <span>PAPER:</span>
                        <div class="paper-display" id="printerPaper">3</div>
                    </div>
                </div>
            </div>
            <div class="printer-output-slot">
                <div class="printer-paper" id="printerOutput"></div>
            </div>
            <div class="printer-controls">
                <button class="printer-btn" id="printerToggle">ON/OFF</button>
                <button class="printer-btn" id="printerPrint">PRINT</button>
                <button class="printer-btn" id="printerFeed">FEED</button>
            </div>
        `;
        
        // Assemble printer
        printer.appendChild(connection);
        printer.appendChild(printerBody);
        
        // Add to body
        document.body.appendChild(printer);
        
        // Add event listeners
        document.getElementById('printerToggle').addEventListener('click', () => this.togglePrinter());
        document.getElementById('printerPrint').addEventListener('click', () => this.printScreen());
        document.getElementById('printerFeed').addEventListener('click', () => this.feedPaper());
        
        // Initialize status displays
        this.updateStatusDisplay();
    }
    
    togglePrinter() {
        // Toggle printer on/off
        this.enabled = !this.enabled;
        
        // Update UI
        if (this.enabled) {
            document.getElementById('gbPrinter').classList.add('accessory-enabled');
            if (window.gbSound) window.gbSound.play('powerup');
        } else {
            document.getElementById('gbPrinter').classList.remove('accessory-enabled');
            if (window.gbSound) window.gbSound.play('button');
        }
        
        // Display status
        this.game.showNotification(this.enabled ? "PRINTER ON" : "PRINTER OFF");
    }
    
    updateStatusDisplay() {
        // Update ink level
        const inkEl = document.getElementById('printerInk');
        if (inkEl) {
            const percentage = (this.inkLevel / ACCESSORY_CONFIG.PRINTER.INK_LEVEL) * 100;
            inkEl.style.width = `${percentage}%`;
            
            // Change color when low
            if (percentage < 20) {
                inkEl.classList.add('ink-low');
            } else {
                inkEl.classList.remove('ink-low');
            }
        }
        
        // Update paper count
        const paperEl = document.getElementById('printerPaper');
        if (paperEl) {
            paperEl.textContent = this.paperCount;
            
            // Change color when low
            if (this.paperCount < 2) {
                paperEl.classList.add('paper-low');
            } else {
                paperEl.classList.remove('paper-low');
            }
        }
    }
    
    printScreen() {
        // Only print if printer is on and not currently printing
        if (!this.enabled || this.printing) return;
        
        // Check paper and ink
        if (this.paperCount <= 0) {
            this.game.showNotification("OUT OF PAPER!");
            if (window.gbSound) window.gbSound.play('hit');
            return;
        }
        
        if (this.inkLevel <= 0) {
            this.game.showNotification("OUT OF INK!");
            if (window.gbSound) window.gbSound.play('hit');
            return;
        }
        
        // Create print based on current game state
        const print = {
            title: "SNAKE BOY",
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            score: this.game.score,
            level: this.game.level,
            length: this.game.snake.length,
            timestamp: Date.now()
        };
        
        // Start printing animation
        this.printing = true;
        this.beginPrintAnimation(print);
        
        // Consume paper and ink
        this.paperCount--;
        this.inkLevel--;
        this.updateStatusDisplay();
        
        // Add to print history
        this.printHistory.push(print);
        
        // Notification
        this.game.showNotification("PRINTING...");
        
        // Print sound
        if (window.gbSound) window.gbSound.play('printer');
    }
    
    beginPrintAnimation(print) {
        // Create paper element
        const paper = document.createElement('div');
        paper.className = 'printing-paper';
        
        // Generate print content
        paper.innerHTML = `
            <div class="print-header">
                <div class="print-title">${print.title}</div>
                <div class="print-date">${print.date}</div>
            </div>
            <div class="print-content">
                <div class="print-data">SCORE: ${print.score}</div>
                <div class="print-data">LEVEL: ${print.level}</div>
                <div class="print-data">LENGTH: ${print.length}</div>
                <div class="print-time">TIME: ${print.time}</div>
            </div>
            <div class="print-footer">
                <div class="print-logo">SNAKE BOY™</div>
            </div>
        `;
        
        // Add print to output slot
        const outputSlot = document.getElementById('printerOutput');
        outputSlot.innerHTML = '';
        outputSlot.appendChild(paper);
        
        // Animate printing
        paper.style.height = '0';
        
        // Print animation
        let currentHeight = 0;
        const totalHeight = 120; // Final paper height
        const printInterval = setInterval(() => {
            currentHeight += 2;
            paper.style.height = `${currentHeight}px`;
            
            // Print sounds
            if (currentHeight % 10 === 0 && window.gbSound) {
                window.gbSound.play('printerLine');
            }
            
            if (currentHeight >= totalHeight) {
                clearInterval(printInterval);
                this.finishPrinting();
            }
        }, 100);
    }
    
    finishPrinting() {
        // End printing state
        this.printing = false;
        
        // Play completion sound
        if (window.gbSound) window.gbSound.play('printerDone');
        
        // Notification
        this.game.showNotification("PRINT COMPLETE!");
    }
    
    feedPaper() {
        // Only works if printer is on and not printing
        if (!this.enabled || this.printing) return;
        
        // Clear output slot
        document.getElementById('printerOutput').innerHTML = '';
        
        // Play paper feed sound
        if (window.gbSound) window.gbSound.play('printerFeed');
        
        // Notification
        this.game.showNotification("PAPER FEED");
    }
}

// Game Boy Link Cable (for ghost multiplayer)
class GameBoyLinkCable {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.connected = false;
        this.ghostSnakes = [];
        this.syncTimer = 0;
        this.dataPackets = [];
        
        // Create link cable UI
        this.createLinkCableUI();
    }
    
    createLinkCableUI() {
        // Create the link cable container
        const linkCable = document.createElement('div');
        linkCable.id = 'gbLinkCable';
        linkCable.className = 'gb-accessory gb-link-cable';
        
        // Add connection visual to Game Boy
        const connection = document.createElement('div');
        connection.className = 'accessory-connection';
        connection.innerHTML = `
            <div class="connection-pins">
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
            </div>
        `;
        
        // Create cable visual
        const cable = document.createElement('div');
        cable.className = 'link-cable';
        cable.innerHTML = `
            <div class="cable-line">
                <div class="data-packets" id="dataPackets"></div>
            </div>
            <div class="cable-end">
                <div class="connection-plug">
                    <div class="plug-label">PLAYER 2</div>
                </div>
            </div>
        `;
        
        // Create controls
        const controls = document.createElement('div');
        controls.className = 'link-controls';
        controls.innerHTML = `
            <button class="link-btn" id="linkToggle">ON/OFF</button>
            <button class="link-btn" id="linkConnect">CONNECT</button>
            <div class="link-status" id="linkStatus">OFFLINE</div>
        `;
        
        // Assemble link cable
        linkCable.appendChild(connection);
        linkCable.appendChild(cable);
        linkCable.appendChild(controls);
        
        // Add to body
        document.body.appendChild(linkCable);
        
        // Add event listeners
        document.getElementById('linkToggle').addEventListener('click', () => this.toggleLink());
        document.getElementById('linkConnect').addEventListener('click', () => this.toggleConnection());
    }
    
    toggleLink() {
        // Toggle link cable on/off
        this.enabled = !this.enabled;
        
        // Update UI
        if (this.enabled) {
            document.getElementById('gbLinkCable').classList.add('accessory-enabled');
            if (window.gbSound) window.gbSound.play('powerup');
        } else {
            document.getElementById('gbLinkCable').classList.remove('accessory-enabled');
            if (window.gbSound) window.gbSound.play('button');
            
            // Disconnect if turning off
            if (this.connected) {
                this.toggleConnection();
            }
        }
        
        // Display status
        this.game.showNotification(this.enabled ? "LINK CABLE ON" : "LINK CABLE OFF");
    }
    
    toggleConnection() {
        // Only work if link cable is on
        if (!this.enabled) return;
        
        // Toggle connection
        this.connected = !this.connected;
        
        // Update UI
        const statusEl = document.getElementById('linkStatus');
        if (statusEl) {
            statusEl.textContent = this.connected ? "CONNECTED" : "OFFLINE";
            statusEl.className = `link-status ${this.connected ? 'connected' : ''}`;
        }
        
        // Handle connection/disconnection
        if (this.connected) {
            // Generate ghost snakes
            this.createGhostSnakes();
            
            // Start data packet animation
            this.startDataPacketAnimation();
            
            // Connection sound
            if (window.gbSound) window.gbSound.play('linkConnect');
            
            // Notification
            this.game.showNotification("PLAYER 2 CONNECTED!");
        } else {
            // Clear ghost snakes
            this.ghostSnakes = [];
            
            // Stop data packet animation
            this.stopDataPacketAnimation();
            
            // Disconnection sound
            if (window.gbSound) window.gbSound.play('linkDisconnect');
            
            // Notification
            this.game.showNotification("PLAYER 2 DISCONNECTED");
        }
    }
    
    createGhostSnakes() {
        // Generate ghost snakes (simulated multiplayer)
        this.ghostSnakes = [];
        
        for (let i = 0; i < ACCESSORY_CONFIG.LINK_CABLE.GHOST_COUNT; i++) {
            // Create ghost snake with random attributes
            const ghostSnake = {
                id: `ghost-${i}`,
                color: this.getRandomGhostColor(),
                segments: [],
                direction: { x: 0, y: 0 },
                speed: Math.random() * 0.5 + 0.5, // Speed multiplier (0.5 - 1.0)
                moveTimer: 0,
                moveInterval: 200 + Math.random() * 300, // Movement interval ms
                length: Math.floor(Math.random() * 5) + 3 // Random length 3-7
            };
            
            // Generate initial position (random edge of grid)
            const edge = Math.floor(Math.random() * 4);
            let startX, startY;
            
            switch (edge) {
                case 0: // Top
                    startX = Math.floor(Math.random() * CONFIG.GRID_SIZE);
                    startY = 0;
                    ghostSnake.direction = { x: 0, y: 1 };
                    break;
                case 1: // Right
                    startX = CONFIG.GRID_SIZE - 1;
                    startY = Math.floor(Math.random() * CONFIG.GRID_SIZE);
                    ghostSnake.direction = { x: -1, y: 0 };
                    break;
                case 2: // Bottom
                    startX = Math.floor(Math.random() * CONFIG.GRID_SIZE);
                    startY = CONFIG.GRID_SIZE - 1;
                    ghostSnake.direction = { x: 0, y: -1 };
                    break;
                case 3: // Left
                    startX = 0;
                    startY = Math.floor(Math.random() * CONFIG.GRID_SIZE);
                    ghostSnake.direction = { x: 1, y: 0 };
                    break;
            }
            
            // Generate initial segments
            for (let j = 0; j < ghostSnake.length; j++) {
                ghostSnake.segments.push({
                    x: startX - ghostSnake.direction.x * j,
                    y: startY - ghostSnake.direction.y * j
                });
            }
            
            // Add to ghost snakes array
            this.ghostSnakes.push(ghostSnake);
        }
    }
    
    getRandomGhostColor() {
        // Return a random ghost color
        const colors = [
            '#306230', // Medium green
            '#0f380f', // Dark green
            '#8bac0f', // Light green
            '#9bbc0f'  // Lightest green
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    startDataPacketAnimation() {
        // Create data packet elements
        const packetContainer = document.getElementById('dataPackets');
        if (!packetContainer) return;
        
        packetContainer.innerHTML = '';
        this.dataPackets = [];
        
        for (let i = 0; i < ACCESSORY_CONFIG.LINK_CABLE.DATA_PACKETS; i++) {
            const packet = document.createElement('div');
            packet.className = 'data-packet';
            packet.style.left = `${Math.random() * 100}%`;
            packet.style.animationDuration = `${Math.random() * 2 + 1}s`;
            packet.style.animationDelay = `${Math.random() * 1}s`;
            
            packetContainer.appendChild(packet);
            this.dataPackets.push(packet);
        }
    }
    
    stopDataPacketAnimation() {
        // Clear data packet elements
        const packetContainer = document.getElementById('dataPackets');
        if (packetContainer) {
            packetContainer.innerHTML = '';
        }
        this.dataPackets = [];
    }
    
    update(deltaTime) {
        // Only update if connected
        if (!this.enabled || !this.connected) return;
        
        // Update ghost snakes
        for (const ghost of this.ghostSnakes) {
            ghost.moveTimer += deltaTime;
            
            if (ghost.moveTimer >= ghost.moveInterval) {
                ghost.moveTimer = 0;
                this.moveGhostSnake(ghost);
            }
        }
        
        // Sync timer for sending "data"
        this.syncTimer += deltaTime;
        if (this.syncTimer >= ACCESSORY_CONFIG.LINK_CABLE.SYNC_INTERVAL) {
            this.syncTimer = 0;
            this.simulateDataSync();
        }
    }
    
    moveGhostSnake(ghost) {
        // Calculate new head position
        const head = ghost.segments[0];
        const newHead = {
            x: head.x + ghost.direction.x,
            y: head.y + ghost.direction.y
        };
        
        // Check if ghost reached edge or would hit something
        if (
            newHead.x < 0 || 
            newHead.x >= CONFIG.GRID_SIZE || 
            newHead.y < 0 || 
            newHead.y >= CONFIG.GRID_SIZE ||
            Math.random() < 0.1 // Random chance to change direction
        ) {
            // Change direction
            this.changeGhostDirection(ghost);
            
            // Calculate new head again
            newHead.x = head.x + ghost.direction.x;
            newHead.y = head.y + ghost.direction.y;
            
            // If still out of bounds, just wrap around
            if (newHead.x < 0) newHead.x = CONFIG.GRID_SIZE - 1;
            if (newHead.x >= CONFIG.GRID_SIZE) newHead.x = 0;
            if (newHead.y < 0) newHead.y = CONFIG.GRID_SIZE - 1;
            if (newHead.y >= CONFIG.GRID_SIZE) newHead.y = 0;
        }
        
        // Add new head
        ghost.segments.unshift(newHead);
        
        // Remove tail
        if (ghost.segments.length > ghost.length) {
            ghost.segments.pop();
        }
    }
    
    changeGhostDirection(ghost) {
        // Pick a new direction (not opposite of current)
        const possibleDirections = [];
        
        if (ghost.direction.x !== 1) possibleDirections.push({ x: -1, y: 0 });
        if (ghost.direction.x !== -1) possibleDirections.push({ x: 1, y: 0 });
        if (ghost.direction.y !== 1) possibleDirections.push({ x: 0, y: -1 });
        if (ghost.direction.y !== -1) possibleDirections.push({ x: 0, y: 1 });
        
        ghost.direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
    }
    
    simulateDataSync() {
        // Simulate data exchange with "Player 2"
        
        // Play sync sound occasionally
        if (Math.random() < 0.3 && window.gbSound) {
            window.gbSound.play('linkData');
        }
        
        // Flash data packets
        for (const packet of this.dataPackets) {
            packet.classList.add('packet-active');
            setTimeout(() => {
                packet.classList.remove('packet-active');
            }, 200);
        }
    }
    
    render(ctx) {
        // Only render ghost snakes if connected and in playing state
        if (!this.enabled || !this.connected || this.game.state !== GAME_STATE.PLAYING) return;
        
        // Calculate pixel size
        const tileSize = Math.min(
            this.game.canvas.width / CONFIG.GRID_SIZE,
            this.game.canvas.height / CONFIG.GRID_SIZE
        );
        
        // Render each ghost snake
        for (const ghost of this.ghostSnakes) {
            // Draw ghost segments
            for (let i = 0; i < ghost.segments.length; i++) {
                const segment = ghost.segments[i];
                const x = segment.x * tileSize;
                const y = segment.y * tileSize;
                
                // Make ghost snakes semi-transparent
                ctx.globalAlpha = 0.5;
                
                // Draw segment
                ctx.fillStyle = ghost.color;
                
                if (i === 0) {
                    // Draw head (slightly larger)
                    ctx.fillRect(x - 1, y - 1, tileSize + 2, tileSize + 2);
                    
                    // Draw eyes
                    ctx.fillStyle = this.game.colors.background;
                    
                    // Position eyes based on direction
                    const eyeSize = tileSize * 0.2;
                    const eyeOffset = tileSize * 0.25;
                    
                    if (ghost.direction.y === -1) { // Up
                        ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                        ctx.fillRect(x + tileSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
                    } else if (ghost.direction.y === 1) { // Down
                        ctx.fillRect(x + eyeOffset, y + tileSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                        ctx.fillRect(x + tileSize - eyeOffset - eyeSize, y + tileSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                    } else if (ghost.direction.x === -1) { // Left
                        ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                        ctx.fillRect(x + eyeOffset, y + tileSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                    } else if (ghost.direction.x === 1) { // Right
                        ctx.fillRect(x + tileSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
                        ctx.fillRect(x + tileSize - eyeOffset - eyeSize, y + tileSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                    }
                } else {
                    // Draw body (slightly smaller for segmented look)
                    const padding = 1;
                    ctx.fillRect(x + padding, y + padding, tileSize - padding * 2, tileSize - padding * 2);
                }
                
                // Reset opacity
                ctx.globalAlpha = 1;
            }
        }
    }
}

// Game Boy Battery Pack (for extra features and battery simulation)
class GameBoyBatteryPack {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.batteryLevel = ACCESSORY_CONFIG.BATTERY_PACK.INITIAL_CHARGE;
        this.lastUpdateTime = 0;
        this.lowBatteryWarning = false;
        
        // Create battery pack UI
        this.createBatteryPackUI();
    }
    
    createBatteryPackUI() {
        // Create the battery pack container
        const batteryPack = document.createElement('div');
        batteryPack.id = 'gbBatteryPack';
        batteryPack.className = 'gb-accessory gb-battery-pack';
        
        // Add connection visual to Game Boy
        const connection = document.createElement('div');
        connection.className = 'accessory-connection';
        connection.innerHTML = `
            <div class="connection-pins">
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
                <div class="pin"></div>
            </div>
        `;
        
        // Create battery pack body
        const batteryBody = document.createElement('div');
        batteryBody.className = 'battery-body';
        batteryBody.innerHTML = `
            <div class="battery-header">
                <div class="battery-logo">SNAKE POWER</div>
                <div class="power-led"></div>
            </div>
            <div class="battery-display">
                <div class="battery-level-indicator">
                    <div class="battery-outline">
                        <div class="battery-nub"></div>
                        <div class="battery-fill" id="batteryFill"></div>
                    </div>
                    <div class="battery-percentage" id="batteryPercentage">100%</div>
                </div>
            </div>
            <div class="battery-controls">
                <button class="battery-btn" id="batteryToggle">ON/OFF</button>
                <button class="battery-btn" id="batteryRecharge">RECHARGE</button>
                <button class="battery-btn" id="batterySave">SAVE</button>
            </div>
        `;
        
        // Assemble battery pack
        batteryPack.appendChild(connection);
        batteryPack.appendChild(batteryBody);
        
        // Add to body
        document.body.appendChild(batteryPack);
        
        // Add event listeners
        document.getElementById('batteryToggle').addEventListener('click', () => this.toggleBattery());
        document.getElementById('batteryRecharge').addEventListener('click', () => this.rechargeBattery());
        document.getElementById('batterySave').addEventListener('click', () => this.saveGameState());
        
        // Update battery display
        this.updateBatteryDisplay();
    }
    
    toggleBattery() {
        // Toggle battery pack on/off
        this.enabled = !this.enabled;
        
        // Update UI
        if (this.enabled) {
            document.getElementById('gbBatteryPack').classList.add('accessory-enabled');
            if (window.gbSound) window.gbSound.play('powerup');
        } else {
            document.getElementById('gbBatteryPack').classList.remove('accessory-enabled');
            if (window.gbSound) window.gbSound.play('button');
        }
        
        // Display status
        this.game.showNotification(this.enabled ? "BATTERY PACK ON" : "BATTERY PACK OFF");
    }
    
    updateBatteryDisplay() {
        // Update battery fill level
        const fillEl = document.getElementById('batteryFill');
        if (fillEl) {
            fillEl.style.width = `${this.batteryLevel}%`;
            
            // Change color based on level
            if (this.batteryLevel < 20) {
                fillEl.className = 'battery-fill low';
            } else if (this.batteryLevel < 50) {
                fillEl.className = 'battery-fill medium';
            } else {
                fillEl.className = 'battery-fill';
            }
        }
        
        // Update percentage text
        const percentageEl = document.getElementById('batteryPercentage');
        if (percentageEl) {
            percentageEl.textContent = `${Math.floor(this.batteryLevel)}%`;
            
            // Add low class when low
            if (this.batteryLevel < 20) {
                percentageEl.classList.add('low');
            } else {
                percentageEl.classList.remove('low');
            }
        }
    }
    
    update(timestamp) {
        // Only update if battery pack is enabled
        if (!this.enabled) return;
        
        // Calculate delta time
        const deltaTime = timestamp - this.lastUpdateTime;
        this.lastUpdateTime = timestamp;
        
        // Drain battery during gameplay
        if (this.game.state === GAME_STATE.PLAYING) {
            this.drainBattery(deltaTime);
        }
        
        // Check for low battery warning
        if (this.batteryLevel < ACCESSORY_CONFIG.BATTERY_PACK.LOW_BATTERY && !this.lowBatteryWarning) {
            this.lowBatteryWarning = true;
            this.showLowBatteryWarning();
        } else if (this.batteryLevel >= ACCESSORY_CONFIG.BATTERY_PACK.LOW_BATTERY && this.lowBatteryWarning) {
            this.lowBatteryWarning = false;
        }
    }
    
    drainBattery(deltaTime) {
        // Drain battery based on gameplay
        const drainAmount = (ACCESSORY_CONFIG.BATTERY_PACK.DRAIN_RATE / 1000) * deltaTime;
        this.batteryLevel -= drainAmount;
        
        // Clamp battery level
        this.batteryLevel = Math.max(0, this.batteryLevel);
        
        // Update display occasionally (not every frame)
        if (Math.random() < 0.05) {
            this.updateBatteryDisplay();
        }
        
        // Check for battery death
        if (this.batteryLevel <= 0) {
            this.batteryDeath();
        }
    }
    
    rechargeBattery() {
        // Only work if battery pack is enabled
        if (!this.enabled) return;
        
        // Recharge animation
        this.batteryLevel = 0;
        this.updateBatteryDisplay();
        
        // Play recharge sound
        if (window.gbSound) window.gbSound.play('batteryRecharge');
        
        // Recharge animation
        let chargeInterval = setInterval(() => {
            this.batteryLevel += 5;
            this.updateBatteryDisplay();
            
            // Play charging tick
            if (window.gbSound && this.batteryLevel % 20 === 0) {
                window.gbSound.play('batteryTick');
            }
            
            if (this.batteryLevel >= 100) {
                clearInterval(chargeInterval);
                this.batteryLevel = 100;
                this.updateBatteryDisplay();
                
                // Play full charge sound
                if (window.gbSound) window.gbSound.play('batteryFull');
                
                // Notification
                this.game.showNotification("BATTERY FULL!");
            }
        }, 200);
    }
    
    saveGameState() {
        // Only work if battery pack is enabled
        if (!this.enabled) return;
        
        // Check if in playing state
        if (this.game.state !== GAME_STATE.PLAYING) {
            this.game.showNotification("CANNOT SAVE NOW");
            if (window.gbSound) window.gbSound.play('hit');
            return;
        }
        
        // Check battery level
        if (this.batteryLevel < 10) {
            this.game.showNotification("LOW BATTERY - CAN'T SAVE");
            if (window.gbSound) window.gbSound.play('hit');
            return;
        }
        
        // Create save data
        const saveData = {
            score: this.game.score,
            level: this.game.level,
            snake: JSON.parse(JSON.stringify(this.game.snake)),
            food: this.game.food ? {...this.game.food} : null,
            grid: JSON.parse(JSON.stringify(this.game.grid)),
            timestamp: Date.now()
        };
        
        // Store in local storage
        try {
            localStorage.setItem('gbSnakeSaveData', JSON.stringify(saveData));
            
            // Notification
            this.game.showNotification("GAME SAVED!");
            
            // Save sound
            if (window.gbSound) window.gbSound.play('gameSave');
            
            // Drain some battery
            this.batteryLevel -= 5;
            this.updateBatteryDisplay();
        } catch (e) {
            console.error('Error saving game:', e);
            this.game.showNotification("SAVE FAILED!");
        }
    }
    
    loadGameState() {
        // Only work if battery pack is enabled
        if (!this.enabled) return false;
        
        // Check for save data
        const savedData = localStorage.getItem('gbSnakeSaveData');
        if (!savedData) {
            this.game.showNotification("NO SAVE DATA");
            if (window.gbSound) window.gbSound.play('hit');
            return false;
        }
        
        try {
            // Parse save data
            const saveData = JSON.parse(savedData);
            
            // Check if save data is valid
            if (!saveData.snake || !saveData.grid) {
                throw new Error('Invalid save data');
            }
            
            // Apply save data to game
            this.game.score = saveData.score;
            this.game.level = saveData.level;
            this.game.snake = saveData.snake;
            this.game.food = saveData.food;
            this.game.grid = saveData.grid;
            
            // Reset direction to prevent immediate death
            this.game.direction = DIRECTION.NONE;
            this.game.nextDirection = DIRECTION.NONE;
            
            // Recalculate game speed
            this.game.calculateSpeed();
            
            // Update UI
            this.game.updateScoreDisplay();
            document.getElementById('levelDisplay').textContent = this.game.level;
            
            // Set state to playing
            this.game.state = GAME_STATE.PLAYING;
            
            // Hide any screens
            document.getElementById('startScreen').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.add('hidden');
            document.getElementById('pauseScreen').classList.add('hidden');
            
            // Show HUD
            document.getElementById('gameHUD').classList.remove('hidden');
            
            // Notification
            this.game.showNotification("GAME LOADED!");
            
            // Load sound
            if (window.gbSound) window.gbSound.play('gameLoad');
            
            // Drain some battery
            this.batteryLevel -= 3;
            this.updateBatteryDisplay();
            
            return true;
        } catch (e) {
            console.error('Error loading game:', e);
            this.game.showNotification("LOAD FAILED!");
            return false;
        }
    }
    
    showLowBatteryWarning() {
        // Create low battery warning
        const warning = document.createElement('div');
        warning.className = 'low-battery-warning';
        warning.textContent = "LOW BATTERY!";
        
        // Add to game
        this.game.canvas.parentNode.appendChild(warning);
        
        // Play warning sound
        if (window.gbSound) window.gbSound.play('lowBattery');
        
        // Remove after animation
        setTimeout(() => {
            warning.remove();
        }, 2000);
    }
    
    batteryDeath() {
        // Pause the game if playing
        if (this.game.state === GAME_STATE.PLAYING) {
            this.game.state = GAME_STATE.PAUSED;
            
            // Show battery death message
            this.game.showNotification("BATTERY DEPLETED - GAME PAUSED");
            
            // Battery death sound
            if (window.gbSound) window.gbSound.play('batteryDead');
            
            // Flicker screen
            const gameScreen = document.querySelector('.screen');
            gameScreen.classList.add('power-flicker');
            
            setTimeout(() => {
                gameScreen.classList.remove('power-flicker');
            }, 2000);
        }
    }
    
    chargeFromPowerUp() {
        // Charge battery when power-up is collected
        if (!this.enabled) return;
        
        this.batteryLevel += ACCESSORY_CONFIG.BATTERY_PACK.CHARGE_RATE;
        this.batteryLevel = Math.min(100, this.batteryLevel);
        this.updateBatteryDisplay();
    }
}

// Add new sounds for accessories
function addAccessorySounds() {
    if (!window.gbSound || !window.gbSound.sounds) return;
    
    // Camera sounds
    window.gbSound.sounds.camera = () => {
        window.gbSound.noise.triggerAttackRelease("16n", Tone.now());
        window.gbSound.pulse1.triggerAttackRelease("C6", "8n", Tone.now() + 0.05);
    };
    
    // Printer sounds
    window.gbSound.sounds.printer = () => {
        window.gbSound.noise.triggerAttackRelease("32n", Tone.now());
        window.gbSound.noise.triggerAttackRelease("32n", Tone.now() + 0.1);
    };
    
    window.gbSound.sounds.printerLine = () => {
        window.gbSound.noise.triggerAttackRelease("64n", Tone.now());
    };
    
    window.gbSound.sounds.printerDone = () => {
        window.gbSound.pulse1.triggerAttackRelease("C5", "16n", Tone.now());
        window.gbSound.pulse1.triggerAttackRelease("E5", "16n", Tone.now() + 0.1);
    };
    
    window.gbSound.sounds.printerFeed = () => {
        window.gbSound.noise.triggerAttackRelease("8n");
    };
    
    // Link cable sounds
    window.gbSound.sounds.linkConnect = () => {
        window.gbSound.pulse1.triggerAttackRelease("C6", "32n", Tone.now());
        window.gbSound.pulse1.triggerAttackRelease("G6", "32n", Tone.now() + 0.05);
        window.gbSound.pulse1.triggerAttackRelease("C7", "16n", Tone.now() + 0.1);
    };
    
    window.gbSound.sounds.linkDisconnect = () => {
        window.gbSound.pulse1.triggerAttackRelease("C7", "32n", Tone.now());
        window.gbSound.pulse1.triggerAttackRelease("G6", "32n", Tone.now() + 0.05);
        window.gbSound.pulse1.triggerAttackRelease("C6", "16n", Tone.now() + 0.1);
    };
    
    window.gbSound.sounds.linkData = () => {
        window.gbSound.pulse2.triggerAttackRelease("G7", "64n");
    };
    
    // Battery pack sounds
    window.gbSound.sounds.batteryRecharge = () => {
        window.gbSound.pulse1.triggerAttackRelease("C5", "8n", Tone.now());
        window.gbSound.pulse1.triggerAttackRelease("G5", "8n", Tone.now() + 0.2);
    };
    
    window.gbSound.sounds.batteryTick = () => {
        window.gbSound.pulse2.triggerAttackRelease("C6", "32n");
    };
    
    window.gbSound.sounds.batteryFull = () => {
        window.gbSound.pulse1.triggerAttackRelease("C6", "16n", Tone.now());
        window.gbSound.pulse1.triggerAttackRelease("E6", "16n", Tone.now() + 0.1);
        window.gbSound.pulse1.triggerAttackRelease("G6", "8n", Tone.now() + 0.2);
    };
    
    window.gbSound.sounds.lowBattery = () => {
        window.gbSound.pulse2.triggerAttackRelease("C4", "16n", Tone.now());
        window.gbSound.pulse2.triggerAttackRelease("C4", "16n", Tone.now() + 0.2);
    };
    
    window.gbSound.sounds.batteryDead = () => {
        window.gbSound.pulse1.triggerAttackRelease("G4", "8n", Tone.now());
        window.gbSound.pulse1.triggerAttackRelease("E4", "8n", Tone.now() + 0.1);
        window.gbSound.pulse1.triggerAttackRelease("C4", "4n", Tone.now() + 0.2);
    };
    
    window.gbSound.sounds.gameSave = () => {
        window.gbSound.pulse1.triggerAttackRelease("C5", "16n", Tone.now());
        window.gbSound.pulse1.triggerAttackRelease("E5", "16n", Tone.now() + 0.1);
        window.gbSound.pulse1.triggerAttackRelease("G5", "16n", Tone.now() + 0.2);
    };
    
    window.gbSound.sounds.gameLoad = () => {
        window.gbSound.pulse1.triggerAttackRelease("G5", "16n", Tone.now());
        window.gbSound.pulse1.triggerAttackRelease("E5", "16n", Tone.now() + 0.1);
        window.gbSound.pulse1.triggerAttackRelease("C5", "16n", Tone.now() + 0.2);
    };
}

// CSS styles for accessories
const accessoryCss = `
/* Game Boy Accessories */
.gb-accessory {
    position: absolute;
    opacity: 0.5;
    transition: opacity 0.3s, transform 0.3s;
    transform: translateY(10px);
    z-index: 10;
    pointer-events: all;
}

.gb-accessory.accessory-enabled {
    opacity: 1;
    transform: translateY(0);
}

/* Accessory Connection */
.accessory-connection {
    border-top: 10px solid var(--gb-screen-border);
    width: 50px;
    margin: 0 auto 5px;
}

.connection-pins {
    display: flex;
    justify-content: space-between;
    background-color: #888;
    padding: 2px;
    border: 1px solid #666;
}

.pin {
    width: 6px;
    height: 8px;
    background-color: #ccc;
    border: 1px solid #999;
}

/* Game Boy Camera */
.gb-camera {
    top: -20px;
    left: -150px;
    width: 140px;
}

.camera-body {
    background-color: var(--gb-case);
    border: 2px solid var(--gb-screen-border);
    border-radius: 8px;
    padding: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.camera-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
}

.camera-logo {
    font-size: 8px;
    font-weight: bold;
    color: var(--gb-screen-border);
}

.camera-battery {
    width: 30px;
    height: 8px;
    background-color: #222;
    border-radius: 2px;
    overflow: hidden;
}

.battery-level {
    height: 100%;
    width: 100%;
    background-color: #4caf50;
    transition: width 0.3s;
}

.battery-level.battery-low {
    background-color: #f44336;
}

.camera-screen {
    position: relative;
    width: 100%;
    height: 80px;
    background-color: var(--gb-lightest);
    border: 2px solid var(--gb-screen-border);
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 5px;
    overflow: hidden;
}

.camera-controls {
    display: flex;
    justify-content: space-between;
}

.camera-btn {
    background-color: var(--gb-button);
    color: white;
    border: none;
    border-radius: 3px;
    padding: 3px 5px;
    font-family: 'Press Start 2P', cursive;
    font-size: 6px;
    cursor: pointer;
}

.camera-btn:active {
    transform: translateY(1px);
}

.camera-flash {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: white;
    animation: flash 0.3s forwards;
}

@keyframes flash {
    0% { opacity: 1; }
    100% { opacity: 0; }
}

/* Game Boy Printer */
.gb-printer {
    top: -20px;
    right: -150px;
    width: 140px;
}

.printer-body {
    background-color: var(--gb-case);
    border: 2px solid var(--gb-screen-border);
    border-radius: 8px;
    padding: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.printer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
}

.printer-logo {
    font-size: 8px;
    font-weight: bold;
    color: var(--gb-screen-border);
}

.printer-status {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.ink-level {
    display: flex;
    align-items: center;
    gap: 3px;
}

.ink-level span, .paper-count span {
    font-size: 6px;
    color: var(--gb-screen-border);
}

.ink-bar {
    width: 100%;
    height: 5px;
    background-color: #4caf50;
    border-radius: 2px;
}

.ink-bar.ink-low {
    background-color: #f44336;
}

.paper-count {
    display: flex;
    align-items: center;
    gap: 3px;
}

.paper-display {
    font-size: 6px;
    color: var(--gb-screen-border);
}

.paper-display.paper-low {
    color: #f44336;
}

.printer-output-slot {
    width: 100%;
    height: 80px;
    background-color: #222;
    border: 2px solid var(--gb-screen-border);
    margin-bottom: 5px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    overflow: hidden;
}

.printer-paper {
    width: 90%;
    background-color: white;
    border-bottom: 1px solid #ccc;
}

.printing-paper {
    width: 100%;
    background-color: white;
    overflow: hidden;
    transition: height 0.1s linear;
}

.print-header {
    border-bottom: 1px dashed #aaa;
    padding: 5px 0;
    display: flex;
    justify-content: space-between;
}

.print-title {
    font-size: 6px;
    font-weight: bold;
}

.print-date {
    font-size: 5px;
}

.print-content {
    padding: 5px 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.print-data, .print-time {
    font-size: 5px;
}

.print-footer {
    border-top: 1px dashed #aaa;
    padding: 5px 0;
    text-align: center;
}

.print-logo {
    font-size: 5px;
    font-style: italic;
}

.printer-controls {
    display: flex;
    justify-content: space-between;
}

.printer-btn {
    background-color: var(--gb-button);
    color: white;
    border: none;
    border-radius: 3px;
    padding: 3px 5px;
    font-family: 'Press Start 2P', cursive;
    font-size: 6px;
    cursor: pointer;
}

.printer-btn:active {
    transform: translateY(1px);
}

/* Game Boy Link Cable */
.gb-link-cable {
    bottom: -20px;
    left: -180px;
    width: 180px;
}

.link-cable {
    position: relative;
    height: 50px;
    margin-bottom: 5px;
}

.cable-line {
    position: absolute;
    top: 25px;
    left: 40px;
    width: 120px;
    height: 6px;
    background-color: #333;
    border-radius: 3px;
    overflow: hidden;
}

.data-packets {
    position: relative;
    width: 100%;
    height: 100%;
}

.data-packet {
    position: absolute;
    width: 4px;
    height: 4px;
    background-color: #9bbc0f;
    border-radius: 50%;
    top: 1px;
    animation: packet-move 3s linear infinite;
}

.data-packet.packet-active {
    background-color: #fff;
    box-shadow: 0 0 5px #fff;
}

@keyframes packet-move {
    0% { left: 0; }
    100% { left: 100%; }
}

.cable-end {
    position: absolute;
    top: 15px;
    right: 0;
    width: 40px;
    height: 30px;
    background-color: var(--gb-case);
    border: 2px solid var(--gb-screen-border);
    border-radius: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.connection-plug {
    width: 30px;
    height: 20px;
    background-color: #555;
    border: 1px solid #333;
    display: flex;
    justify-content: center;
    align-items: center;
}

.plug-label {
    font-size: 5px;
    color: white;
    text-align: center;
}

.link-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--gb-case);
    border: 2px solid var(--gb-screen-border);
    border-radius: 5px;
    padding: 5px;
}

.link-btn {
    background-color: var(--gb-button);
    color: white;
    border: none;
    border-radius: 3px;
    padding: 3px 5px;
    font-family: 'Press Start 2P', cursive;
    font-size: 6px;
    cursor: pointer;
}

.link-btn:active {
    transform: translateY(1px);
}

.link-status {
    font-size: 6px;
    color: #f44336;
    padding: 2px 5px;
    border: 1px solid #f44336;
    border-radius: 3px;
}

.link-status.connected {
    color: #4caf50;
    border-color: #4caf50;
}

/* Game Boy Battery Pack */
.gb-battery-pack {
    bottom: -20px;
    right: -150px;
    width: 140px;
}

.battery-body {
    background-color: var(--gb-case);
    border: 2px solid var(--gb-screen-border);
    border-radius: 8px;
    padding: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.battery-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
}

.battery-logo {
    font-size: 8px;
    font-weight: bold;
    color: var(--gb-screen-border);
}

.power-led {
    width: 6px;
    height: 6px;
    background-color: #f44336;
    border-radius: 50%;
    animation: blink 2s infinite;
}

.battery-display {
    width: 100%;
    background-color: #222;
    border: 2px solid var(--gb-screen-border);
    padding: 10px;
    margin-bottom: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.battery-level-indicator {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
}

.battery-outline {
    position: relative;
    width: 50px;
    height: 25px;
    border: 2px solid #ccc;
    border-radius: 3px;
    overflow: hidden;
}

.battery-nub {
    position: absolute;
    top: 5px;
    right: -4px;
    width: 4px;
    height: 15px;
    background-color: #ccc;
    border-radius: 0 3px 3px 0;
}

.battery-fill {
    height: 100%;
    width: 100%;
    background-color: #4caf50;
    transition: width 0.3s;
}

.battery-fill.medium {
    background-color: #ff9800;
}

.battery-fill.low {
    background-color: #f44336;
}

.battery-percentage {
    font-size: 8px;
    color: white;
}

.battery-percentage.low {
    color: #f44336;
}

.battery-controls {
    display: flex;
    justify-content: space-between;
}

.battery-btn {
    background-color: var(--gb-button);
    color: white;
    border: none;
    border-radius: 3px;
    padding: 3px 5px;
    font-family: 'Press Start 2P', cursive;
    font-size: 6px;
    cursor: pointer;
}

.battery-btn:active {
    transform: translateY(1px);
}

.low-battery-warning {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(244, 67, 54, 0.8);
    color: white;
    padding: 10px 20px;
    font-size: 12px;
    border-radius: 5px;
    animation: blink 0.5s infinite;
    z-index: 100;
}

.power-flicker {
    animation: flicker 2s;
}

@keyframes flicker {
    0%, 100% { opacity: 1; }
    10%, 30%, 50%, 70%, 90% { opacity: 0.7; }
    20%, 40%, 60%, 80% { opacity: 0.3; }
}

/* Media Queries */
@media (max-width: 1024px) {
    .gb-camera, .gb-printer, .gb-link-cable, .gb-battery-pack {
        transform: scale(0.8) translateY(10px);
    }
    
    .accessory-enabled {
        transform: scale(0.8) translateY(0) !important;
    }
}

@media (max-width: 768px) {
    .gb-camera, .gb-printer, .gb-link-cable, .gb-battery-pack {
        transform: scale(0.7) translateY(10px);
    }
    
    .accessory-enabled {
        transform: scale(0.7) translateY(0) !important;
    }
    
    .gb-camera { left: -130px; }
    .gb-printer { right: -130px; }
    .gb-link-cable { left: -160px; }
    .gb-battery-pack { right: -130px; }
}
`;

// Initialize all accessories
function initAccessories(game) {
    // Add CSS for accessories
    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = accessoryCss;
    document.head.appendChild(styleSheet);
    
    // Add accessory sounds
    addAccessorySounds();
    
    // Create accessories
    const camera = new GameBoyCamera(game);
    const printer = new GameBoyPrinter(game);
    const linkCable = new GameBoyLinkCable(game);
    const batteryPack = new GameBoyBatteryPack(game);
    
    // Add accessories to game
    game.accessories = {
        camera,
        printer,
        linkCable,
        batteryPack
    };
    
    // Enhance game render method to include accessories
    const originalRender = game.render;
    game.render = function() {
        // Call original render
        originalRender.call(this);
        
        // Render link cable ghost snakes
        if (linkCable.enabled && linkCable.connected) {
            linkCable.render(this.ctx);
        }
        
        // Render shield effect
        if (this.shieldActive) {
            this.drawShieldEffect(
                Math.min(this.canvas.width / CONFIG.GRID_SIZE, this.canvas.height / CONFIG.GRID_SIZE)
            );
        }
    };
    
    // Enhance game update method to include accessories
    const originalUpdate = game.update;
    game.update = function() {
        // Get current timestamp
        const now = performance.now();
        
        // Update accessories
        if (camera.enabled) camera.update(now);
        if (linkCable.enabled && linkCable.connected) linkCable.update(now - this.lastMoveTime);
        if (batteryPack.enabled) batteryPack.update(now);
        
        // Call original update
        originalUpdate.call(this);
    };
    
    // Enhance power-up collection to charge battery
    const originalCollectPowerUp = game.collectPowerUp;
    if (typeof originalCollectPowerUp === 'function') {
        game.collectPowerUp = function() {
            // Call original method
            const result = originalCollectPowerUp.call(this);
            
            // Charge battery if enabled
            if (batteryPack.enabled) {
                batteryPack.chargeFromPowerUp();
            }
            
            return result;
        };
    }
    
    // Enhance special food collection to charge battery
    const originalEatSpecialFood = game.eatSpecialFood;
    if (typeof originalEatSpecialFood === 'function') {
        game.eatSpecialFood = function() {
            // Call original method
            const result = originalEatSpecialFood.call(this);
            
            // Charge battery if enabled
            if (batteryPack.enabled) {
                batteryPack.chargeFromPowerUp();
            }
            
            return result;
        };
    }
    
    // Add load game from battery pack to start game
    const originalStartGame = game.startGame;
    game.startGame = function() {
        // Try to load saved game if battery pack enabled
        if (batteryPack.enabled && batteryPack.loadGameState()) {
            // Game loaded successfully, skip original start
            return;
        }
        
        // Call original start game
        originalStartGame.call(this);
    };
    
    // Add camera controls to side buttons
    document.addEventListener('keydown', function(event) {
        // Camera next/prev photo with arrow keys
        if (camera.enabled && camera.viewMode === 'photos') {
            if (event.key === 'ArrowLeft') {
                camera.browsePhotos('prev');
            } else if (event.key === 'ArrowRight') {
                camera.browsePhotos('next');
            } else if (event.key === 'Delete') {
                camera.deleteCurrentPhoto();
            }
        }
    });
    
    // Make accessories draggable
    makeAccessoriesDraggable();
    
    return game;
}

// Make accessories draggable
function makeAccessoriesDraggable() {
    const accessories = document.querySelectorAll('.gb-accessory');
    
    accessories.forEach(accessory => {
        let isDragging = false;
        let offsetX, offsetY;
        
        // Add drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.style.position = 'absolute';
        dragHandle.style.top = '5px';
        dragHandle.style.right = '5px';
        dragHandle.style.cursor = 'move';
        dragHandle.style.fontSize = '8px';
        dragHandle.style.color = '#666';
        
        accessory.appendChild(dragHandle);
        
        dragHandle.addEventListener('mousedown', startDrag);
        dragHandle.addEventListener('touchstart', startDrag);
        
        function startDrag(e) {
            e.preventDefault();
            
            isDragging = true;
            
            // Get mouse or touch position
            const pageX = e.pageX || e.touches[0].pageX;
            const pageY = e.pageY || e.touches[0].pageY;
            
            // Calculate offset
            const rect = accessory.getBoundingClientRect();
            offsetX = pageX - rect.left;
            offsetY = pageY - rect.top;
            
            // Add event listeners
            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag);
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
        }
        
        function drag(e) {
            if (!isDragging) return;
            
            // Get mouse or touch position
            const pageX = e.pageX || e.touches[0].pageX;
            const pageY = e.pageY || e.touches[0].pageY;
            
            // Calculate new position
            const left = pageX - offsetX;
            const top = pageY - offsetY;
            
            // Set new position
            accessory.style.left = `${left}px`;
            accessory.style.top = `${top}px`;
            accessory.style.right = 'auto';
            accessory.style.bottom = 'auto';
        }
        
        function stopDrag() {
            isDragging = false;
            
            // Remove event listeners
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
        }
    });
}

// Export the accessory initialization function
window.initGameBoyAccessories = initAccessories;