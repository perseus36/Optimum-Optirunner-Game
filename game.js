class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas to full screen dimensions
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        

        
        // Game state
        this.gameRunning = false;
        this.gameOver = false;
        this.gamePaused = false;
        this.score = 0;
        this.opti = parseInt(localStorage.getItem('opti')) || 0; // $OPTI value, retrieved from localStorage

        this.username = localStorage.getItem('username') || '';
        this.leaderboardVisible = false;
        this.howToPlayVisible = false;
        this.weeklyLeaderboardUnsubscribe = null;
        
        // Main character
        this.player = {
            x: 150, // Position according to new canvas size
            y: this.height - 92, // 72px character + 20px ground
            width: 54,  // 25% reduced width (72 * 0.75 = 54)
            height: 72, // 50% enlarged height (48 * 1.5)
            velocityY: 0,
            jumping: false,
            gravity: 0.72, // 10% reduced for longer horizontal distance (0.8 * 0.9 = 0.72)
            jumpPower: -15,
            baseGravity: 0.72, // Base gravity value for calculations
            baseJumpPower: -15 // Base jump power value for calculations
        };
        
        // Character graphics - PNG sprite animation
        this.sprite1 = new Image();
        this.sprite1.src = 'assets/sprites/1.png';
        this.sprite2 = new Image();
        this.sprite2.src = 'assets/sprites/2.png';
        
        // Sprite animation system
        this.currentSprite = 0; // 0: sprite1, 1: sprite2
        this.animationSpeed = 20; // Sprite changes every 20 frames (slower)
        this.animationCounter = 0;
        
        // Indicate when sprites are loaded and ready
        this.sprite1.onload = () => {
            console.log('1.png loaded and ready!');
            console.log('Sprite dimensions:', this.sprite1.naturalWidth, 'x', this.sprite1.naturalHeight);
        };
        this.sprite2.onload = () => {
            console.log('2.png loaded and ready!');
            console.log('Sprite dimensions:', this.sprite2.naturalWidth, 'x', this.sprite2.naturalHeight);
        };
        
        // Obstacles
        this.obstacles = [];
        this.obstacleSpeed = 3;
        this.obstacleSpawnRate = 120; // Spawn obstacle every 120 frames
        this.baseObstacleSpawnRate = 120; // Base spawn rate to calculate increases
        this.obstacleSpeedIncreaseInterval = 600; // 10 seconds (60 FPS * 10)
        this.obstacleSpeedIncreaseAmount = 0.20; // 20% increase every 10 seconds
        this.currentObstacleSpeedMultiplier = 1; // Current speed multiplier
        this.frameCount = 0;
        this.lastObstacleSpawnFrame = 0; // Frame when last obstacle spawned
        this.gameStartFrame = 0; // Frame when game started
        this.speedIncreaseStarted = false; // Whether speed increase has started
        
                 // Giant obstacle system - every 10 obstacles, one random obstacle becomes giant
         this.obstacleCount = 0; // Count of obstacles spawned
         this.giantObstacleDistance = 200; // Distance in frames when giant obstacle appears
         this.currentGroupGiantPosition = 0; // Which position in current group will be giant (1-10)
        
        // Obstacle graphics - 2 different stone graphics
        this.obstacleSprite1 = new Image();
        this.obstacleSprite1.src = 'assets/sprites/stone1.png';
        this.obstacleSprite2 = new Image();
        this.obstacleSprite2.src = 'assets/sprites/stone2.png';
        
        // Optimum logo graphic
        this.optimumSprite = new Image();
        this.optimumSprite.src = 'assets/sprites/optimum2.webp';
        
        // Indicate when obstacle sprites are loaded and ready
        this.obstacleSprite1.onload = () => {
            console.log('stone1.png loaded and ready!');
            console.log('Obstacle dimensions:', this.obstacleSprite1.naturalWidth, 'x', this.obstacleSprite1.naturalHeight);
        };
        this.obstacleSprite2.onload = () => {
            console.log('stone2.png loaded and ready!');
            console.log('Obstacle dimensions:', this.obstacleSprite2.naturalWidth, 'x', this.obstacleSprite2.naturalHeight);
        };
        
        // Indicate when optimum sprite is loaded and ready
        this.optimumSprite.onload = () => {
            console.log('optimum.svg loaded and ready!');
            console.log('Optimum dimensions:', this.optimumSprite.naturalWidth, 'x', this.optimumSprite.naturalHeight);
        };
        
        // Bonus system
        this.bonuses = [];
        this.bonusSpawnRate = 300; // Spawn bonus every 300 frames (approximately 5 seconds)
        this.bonusSprite = new Image();
        this.bonusSprite.src = 'assets/sprites/bonus.webp';
        
        // Indicate when bonus sprite is loaded and ready
        this.bonusSprite.onload = () => {
            console.log('bonus.webp loaded and ready!');
            console.log('Bonus dimensions:', this.bonusSprite.naturalWidth, 'x', this.bonusSprite.naturalHeight);
        };
        
        // Cloud graphics - 3 different cloud graphics
        this.cloudSprite1 = new Image();
        this.cloudSprite1.src = 'assets/sprites/cloud1.png';
        this.cloudSprite2 = new Image();
        this.cloudSprite2.src = 'assets/sprites/cloud2.png';
        this.cloudSprite3 = new Image();
        this.cloudSprite3.src = 'assets/sprites/cloud3.png';
        
                 // Cloud animation system - will be updated in setupResponsiveCanvas
         this.clouds = [
             { sprite: this.cloudSprite1, x: 150, y: 80, width: 480, height: 320, speed: 1.5 },
             { sprite: this.cloudSprite2, x: 150 + 480 + 100, y: 60, width: 400, height: 280, speed: 1.5 },
             { sprite: this.cloudSprite3, x: 150 + 480 + 100 + 400 + 100, y: 120, width: 360, height: 240, speed: 1.5 }
         ];
        
        // Cloud spacing system
        this.cloudSpacing = [100, 100]; // Initial spacing between clouds
        this.generateNewCloudSpacing(); // Generate initial random spacing
        
        // Music system
        this.backgroundMusic = new Audio('assets/music/optimusic.mp3');
        this.backgroundMusic.loop = true; // Music loops continuously
        this.backgroundMusic.volume = 0.5; // Initial volume level
        this.isMusicPlaying = false;
        this.isMuted = false;
        
        // Death sound system
        this.deathSound = new Audio('assets/music/death.wav');
        this.deathSound.volume = 0.7; // Death sound volume
        
        // Indicate when cloud sprites are loaded and ready
        this.cloudSprite1.onload = () => {
            console.log('cloud1.png loaded and ready!');
            console.log('Cloud dimensions:', this.cloudSprite1.naturalWidth, 'x', this.cloudSprite1.naturalHeight);
        };
        this.cloudSprite2.onload = () => {
            console.log('cloud2.png loaded and ready!');
            console.log('Cloud dimensions:', this.cloudSprite2.naturalWidth, 'x', this.cloudSprite2.naturalHeight);
        };
        this.cloudSprite3.onload = () => {
            console.log('cloud3.png loaded and ready!');
            console.log('Cloud dimensions:', this.cloudSprite3.naturalWidth, 'x', this.cloudSprite3.naturalHeight);
        };
        
        // Ground - 2x larger (was 20px, now 40px)
        this.ground = this.height - 40;
        
        // Update player position for full screen
        this.player.y = this.height - 112;
        
        // Canvas responsive settings
        this.setupResponsiveCanvas();
        
        // Event listeners
        this.setupEventListeners();
        
        // UI update
        this.updateUI();
        
        // Check if username exists and auto-fill input
        this.checkSavedUsername();
        
        // Game loop
        this.gameLoop();
    }
    
    // Method to generate random cloud spacing between 100-400 pixels
    generateNewCloudSpacing() {
        this.cloudSpacing[0] = Math.floor(Math.random() * (400 - 100 + 1)) + 100; // Random between 100-400
        this.cloudSpacing[1] = Math.floor(Math.random() * (400 - 100 + 1)) + 100; // Random between 100-400
        console.log(`New cloud spacing generated: ${this.cloudSpacing[0]}px, ${this.cloudSpacing[1]}px`);
    }
    
    // Method to reposition clouds with current spacing
    repositionCloudsWithSpacing() {
        // First cloud position
        this.clouds[0].x = 150;
        this.clouds[0].y = 80 + Math.random() * 40; // Random height variation
        
        // Second cloud position with first spacing
        this.clouds[1].x = this.clouds[0].x + this.clouds[0].width + this.cloudSpacing[0];
        this.clouds[1].y = 60 + Math.random() * 40; // Random height variation
        
        // Third cloud position with second spacing
        this.clouds[2].x = this.clouds[1].x + this.clouds[1].width + this.cloudSpacing[1];
        this.clouds[2].y = 120 + Math.random() * 40; // Random height variation
        
        // Ensure all clouds are visible on screen
        this.clouds.forEach(cloud => {
            if (cloud.x < 0) {
                cloud.x = this.width + Math.random() * 200; // Random position on right side
            }
        });
        
        console.log(`Clouds repositioned with spacing: ${this.cloudSpacing[0]}px, ${this.cloudSpacing[1]}px`);
    }
    
    // Music control methods
    startBackgroundMusic() {
        if (!this.isMuted && !this.isMusicPlaying) {
            this.backgroundMusic.play().then(() => {
                this.isMusicPlaying = true;
                console.log('Background music started playing');
            }).catch(error => {
                console.log('Could not play background music:', error);
            });
        }
    }
    
    stopBackgroundMusic() {
        if (this.isMusicPlaying) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            this.isMusicPlaying = false;
            console.log('Background music stopped');
        }
    }
    
    toggleSound() {
        if (this.isMuted) {
            // Unmute
            this.isMuted = false;
            this.backgroundMusic.volume = 0.5;
            this.deathSound.volume = 0.7;
            document.getElementById('soundIcon').textContent = '🔊';
            document.getElementById('soundToggleBtn').classList.remove('muted');
            
            // If game is running, start music
            if (this.gameRunning && !this.isMusicPlaying) {
                this.startBackgroundMusic();
            }
            
            console.log('Sound unmuted');
        } else {
            // Mute
            this.isMuted = true;
            this.backgroundMusic.volume = 0;
            this.deathSound.volume = 0;
            document.getElementById('soundIcon').textContent = '🔇';
            document.getElementById('soundToggleBtn').classList.add('muted');
            
            console.log('Sound muted');
        }
    }
    
    // Method to play death sound
    playDeathSound() {
        if (!this.isMuted) {
            // Reset death sound to beginning
            this.deathSound.currentTime = 0;
            
            // Play death sound
            this.deathSound.play().then(() => {
                console.log('Death sound played');
            }).catch(error => {
                console.log('Could not play death sound:', error);
            });
        }
    }
    
    // GIF animation functions removed - using simple approach
    
    setupResponsiveCanvas() {
        // Set canvas to full screen dimensions
        const resizeCanvas = () => {
            // Set canvas dimensions to full viewport
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            
            // Update game dimensions
            this.width = this.canvas.width;
            this.height = this.canvas.height;
            
            // Update ground position - 2x larger
            this.ground = this.height - 40;
            
            // Update player position
            this.player.y = this.height - 112;
            
                         // Update cloud positions for full screen with current random spacing
                         this.repositionCloudsWithSpacing();
        };
        
        // Run when page loads and on resize
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    setupEventListeners() {
        // Jumping with Space key
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameRunning && !this.gameOver && !this.gamePaused) {
                e.preventDefault();
                this.jump();
            }
            
            // Pause/Unpause with ESC key
            if (e.code === 'Escape' && this.gameRunning && !this.gameOver) {
                e.preventDefault();
                this.togglePause();
            }
        });
        
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Username input - Enter key to start game
        document.getElementById('usernameInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.startGame();
            }
        });
        
        // Leaderboard button
        document.getElementById('leaderboardBtn').addEventListener('click', () => {
            this.showLeaderboard();
        });
        
        // Close leaderboard button (X)
        document.getElementById('closeLeaderboardBtn').addEventListener('click', () => {
            this.hideLeaderboard();
        });
        
        // How to Play button
        document.getElementById('howToPlayBtn').addEventListener('click', () => {
            this.showHowToPlay();
        });
        
        // Close How to Play button (X)
        document.getElementById('closeHowToPlayBtn').addEventListener('click', () => {
            this.hideHowToPlay();
        });
        
        // ESC key to close leaderboard or how to play
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.leaderboardVisible) {
                this.hideLeaderboard();
            }
            if (e.key === 'Escape' && this.howToPlayVisible) {
                this.hideHowToPlay();
            }
        });
        
        // Play again button (only in game over screen)
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        // Main menu button (game over screen)
        document.getElementById('mainMenuBtnGameOver').addEventListener('click', () => {
            this.returnToMainMenu();
        });
        
        // Pause menu buttons
        document.getElementById('continueBtn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('mainMenuBtn').addEventListener('click', () => {
            this.returnToMainMenu();
        });
        
        // Touch support (for mobile)
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.gameRunning && !this.gameOver && !this.gamePaused) {
                e.preventDefault();
                this.jump();
            }
        });
        
        // Sound control button
        document.getElementById('soundToggleBtn').addEventListener('click', () => {
            this.toggleSound();
        });
        
        // Auto-pause when switching tabs or losing focus
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameRunning && !this.gameOver && !this.gamePaused) {
                console.log('Tab switched - auto-pausing game');
                this.autoPause();
            }
        });
        
        // Auto-pause when window loses focus (switching to other applications)
        window.addEventListener('blur', () => {
            if (this.gameRunning && !this.gameOver && !this.gamePaused) {
                console.log('Window lost focus - auto-pausing game');
                this.autoPause();
            }
        });
        
        // Leaderboard type buttons
        document.getElementById('weeklyLbBtn').addEventListener('click', () => {
            this.switchToWeeklyLeaderboard();
        });
        
        document.getElementById('globalLbBtn').addEventListener('click', () => {
            this.switchToGlobalLeaderboard();
        });
    }
    
    startGame() {
        // Get username from input
        const usernameInput = document.getElementById('usernameInput');
        const username = usernameInput.value.trim();
        
        // Check if username is empty
        if (!username) {
            this.showUsernameError();
            return;
        }
        
        this.username = username;
        
        // Save username to localStorage for future use
        localStorage.setItem('username', username);
        
        this.gameRunning = true;
        this.gameOver = false;
        this.gamePaused = false;
        this.score = 0;
        // this.opti sıfırlanmaz - kalıcı olarak saklanır
        this.obstacles = [];
        this.bonuses = [];
        this.frameCount = 0;
        this.lastObstacleSpawnFrame = 0; // Reset obstacle spawn system
        this.optimumLogo = null; // Reset optimum logo
        this.obstacleCount = 0; // Reset obstacle counter for giant system
        this.currentGroupGiantPosition = 0; // Reset giant position for new group
        
        // Reset obstacle speed system
        this.obstacleSpawnRate = this.baseObstacleSpawnRate;
        this.currentObstacleSpeedMultiplier = 1;
        this.gameStartFrame = this.frameCount; // Record when game started
        this.speedIncreaseStarted = false; // Reset speed increase flag
        
        // Reset player jump mechanics to base values
        this.player.gravity = this.player.baseGravity;
        this.player.jumpPower = this.player.baseJumpPower;
        
        this.player.y = this.height - 112; // 72px character + 20px ground
        this.player.x = 150; // Position according to new canvas size
        this.player.velocityY = 0;
        this.player.jumping = false;
        
        // Spawn first obstacle immediately at center of screen
        this.spawnFirstObstacle();
        
        // Hide the start overlay
        document.getElementById('gameStartOverlay').style.display = 'none';
        document.getElementById('gameOver').style.display = 'none';
        
        // Hide username input container after username is set
        const usernameInputContainer = document.querySelector('.username-input-container');
        if (usernameInputContainer) {
            usernameInputContainer.style.display = 'none';
        }
        
        // Show username display
        this.showUsername();
        
        // Start background music
        this.startBackgroundMusic();
        
        this.updateUI();
    }
    
    restartGame() {
        // Stop current music
        this.stopBackgroundMusic();
        
        // Show the start overlay again when restarting
        document.getElementById('gameStartOverlay').style.display = 'flex';
        
        // Don't show username input container again - keep it hidden since username is already set
        // const usernameInputContainer = document.querySelector('.username-input-container');
        // if (usernameInputContainer) {
        //     usernameInputContainer.style.display = 'flex';
        // }
        
        this.startGame();
    }
    
    togglePause() {
        if (this.gamePaused) {
            // Unpause the game
            this.gamePaused = false;
            document.getElementById('gamePauseOverlay').style.display = 'none';
        } else {
            // Pause the game
            this.gamePaused = true;
            document.getElementById('gamePauseOverlay').style.display = 'flex';
            
            // Music continues playing when paused
        }
    }
    
    // Auto-pause method for when user switches tabs or loses focus
    autoPause() {
        if (this.gameRunning && !this.gameOver && !this.gamePaused) {
            this.gamePaused = true;
            document.getElementById('gamePauseOverlay').style.display = 'flex';
            
            // Music continues playing when auto-paused
            
            console.log('Game auto-paused due to tab switch or focus loss');
        }
    }
    
    returnToMainMenu() {
        // Hide pause overlay
        document.getElementById('gamePauseOverlay').style.display = 'none';
        
        // Reset game state
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameOver = false;
        this.score = 0;
        this.obstacles = [];
        this.bonuses = [];
        this.frameCount = 0;
        this.lastObstacleSpawnFrame = 0;
        this.optimumLogo = null; // Reset optimum logo
        this.obstacleCount = 0; // Reset obstacle counter for giant system
        this.currentGroupGiantPosition = 0; // Reset giant position for new group
        
        // Reset obstacle speed system
        this.obstacleSpawnRate = this.baseObstacleSpawnRate;
        this.currentObstacleSpeedMultiplier = 1;
        this.gameStartFrame = 0;
        this.speedIncreaseStarted = false;
        
        // Reset player jump mechanics to base values
        this.player.gravity = this.player.baseGravity;
        this.player.jumpPower = this.player.baseJumpPower;
        
        // Reset player position
        this.player.y = this.height - 112;
        this.player.x = 150;
        this.player.velocityY = 0;
        this.player.jumping = false;
        
        // Show start overlay
        document.getElementById('gameStartOverlay').style.display = 'flex';
        document.getElementById('gameOver').style.display = 'none';
        
        // Don't show username input container again - keep it hidden since username is already set
        // const usernameInputContainer = document.querySelector('.username-input-container');
        // if (usernameInputContainer) {
        //     usernameInputContainer.style.display = 'flex';
        // }
        
        // Hide username display
        this.hideUsername();
        
        // Stop background music
        this.stopBackgroundMusic();
        
        // Update UI
        this.updateUI();
    }
    
    spawnFirstObstacle() {
        // Randomly select stone graphic (1 or 2)
        const stoneType = Math.random() < 0.5 ? 1 : 2;
        
        const obstacle = {
            x: this.width / 2, // Start from center of screen
            y: this.ground - 72, // Position adjustment for 10% reduced height (80 * 0.9 = 72)
            width: 54,  // 10% reduced (60 * 0.9 = 54)
            height: 72, // 10% reduced (80 * 0.9 = 72)
            passed: false,
            stoneType: stoneType // Specify which stone graphic to use
        };
        this.obstacles.push(obstacle);
        
        // Calculate random distance for next obstacle (same as normal spawn system)
        const minDistance = Math.floor(this.obstacleSpawnRate * 0.8); // 20% shorter (96 frames)
        const maxDistance = Math.floor(this.obstacleSpawnRate * 1.25); // 25% longer (150 frames)
        const randomDistance = Math.floor(Math.random() * (maxDistance - minDistance + 1)) + minDistance;
        
        // Set the spawn frame so next obstacle appears at correct distance
        this.lastObstacleSpawnFrame = this.frameCount - randomDistance;
        
        // Create optimum logo between first and second obstacles
        const firstObstacleX = this.width / 2;
        const secondObstacleX = firstObstacleX + (randomDistance * this.obstacleSpeed * this.currentObstacleSpeedMultiplier);
        const optimumX = firstObstacleX + (secondObstacleX - firstObstacleX) / 2 + (90 * this.obstacleSpeed * this.currentObstacleSpeedMultiplier) - 20; // 90 frames more to the right - 20px left (10 frames more to the left)
        const optimumY = this.ground - 72 - 144 - 80; // 2x obstacle height above ground + 80px up (60px + 20px)
        
        this.optimumLogo = {
            x: optimumX,
            y: optimumY,
            width: 0.14, // 14% of original size (reduced by 86% total)
            height: 0.14,  // 14% of original size (reduced by 86% total)
            visible: true
        };
        
        console.log(`First obstacle spawned at center of screen! Next obstacle in ${randomDistance} frames`);
    }
    
    jump() {
        if (!this.player.jumping) {
            this.player.velocityY = this.player.jumpPower;
            this.player.jumping = true;
        }
    }
    
    updatePlayer() {
        // Apply gravity
        this.player.velocityY += this.player.gravity;
        this.player.y += this.player.velocityY;
        
        // Ground check
        if (this.player.y >= this.ground - this.player.height) {
            this.player.y = this.ground - this.player.height;
            this.player.velocityY = 0;
            this.player.jumping = false;
        }
    }
    
    updateObstacleSpeed() {
        // Check if 10 seconds have passed since game start
        const framesSinceGameStart = this.frameCount - this.gameStartFrame;
        const tenSecondsInFrames = 600; // 10 seconds * 60 FPS
        
        // Start speed increase after 10 seconds
        if (framesSinceGameStart >= tenSecondsInFrames && !this.speedIncreaseStarted) {
            this.speedIncreaseStarted = true;
            console.log('Speed increase system activated after 10 seconds!');
        }
        
        // Only increase speed if system is activated and every 10 seconds
        if (this.speedIncreaseStarted && 
            framesSinceGameStart % this.obstacleSpeedIncreaseInterval === 0) {
            
            this.currentObstacleSpeedMultiplier += this.obstacleSpeedIncreaseAmount;
            
            // Calculate new spawn rate (faster spawn = lower frame count)
            // Remove the minimum limit to allow unlimited speed increases
            this.obstacleSpawnRate = Math.floor(this.baseObstacleSpawnRate / this.currentObstacleSpeedMultiplier);
            
            // Adjust player jump mechanics to maintain challenge as speed increases
            this.adjustPlayerJumpMechanics();
            
            // Add visual feedback for speed increase
            this.showObstacleSpeedIncreaseEffect();
            
            const speedPercentage = Math.round((this.baseObstacleSpawnRate / this.obstacleSpawnRate) * 100);
            console.log(`Obstacle speed increased by 20%! Current spawn rate: ${this.obstacleSpawnRate} frames (${speedPercentage}% of base speed)`);
        }
    }
    
    adjustPlayerJumpMechanics() {
        // Calculate the ratio between current speed and base speed
        const speedRatio = this.currentObstacleSpeedMultiplier;
        
        // Adjust gravity to make jumps shorter as speed increases
        // Higher gravity = shorter horizontal jump distance
        // Each speed increase (every 10 seconds) reduces jump distance by 10%
        // Formula: gravity increases by 10% each time (1.1 multiplier)
        this.player.gravity = this.player.baseGravity * Math.pow(1.1, speedRatio - 1);
        
        // Keep jump power the same to maintain vertical jump height
        this.player.jumpPower = this.player.baseJumpPower;
        
        console.log(`Jump mechanics adjusted: Gravity: ${this.player.gravity.toFixed(3)}, Jump Power: ${this.player.jumpPower.toFixed(3)}`);
    }
    
    showObstacleSpeedIncreaseEffect() {
        // Create a temporary visual effect to show speed increase
        const speedEffect = document.createElement('div');
        speedEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 107, 107, 0.9);
            color: white;
            padding: 20px 40px;
            border-radius: 15px;
            font-size: 1.5rem;
            font-weight: bold;
            font-family: 'Comfortaa', sans-serif;
            z-index: 1000;
            animation: speedIncreaseEffect 2s ease-out forwards;
            pointer-events: none;
        `;
        speedEffect.textContent = '🚀 SPEED +20%! 🚀';
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes speedIncreaseEffect {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        // Add to canvas container
        document.querySelector('.canvas-container').appendChild(speedEffect);
        
        // Remove after animation
        setTimeout(() => {
            if (speedEffect.parentNode) {
                speedEffect.parentNode.removeChild(speedEffect);
            }
        }, 2000);
    }
    

    
    spawnObstacle() {
        // Current fixed distance: 120 frames
        // Random distance: between 20% shorter and 25% longer
        const minDistance = Math.floor(this.obstacleSpawnRate * 0.8); // 20% shorter (96 frames)
        const maxDistance = Math.floor(this.obstacleSpawnRate * 1.25); // 25% longer (150 frames)
        
        // Number of frames since last obstacle
        const framesSinceLastObstacle = this.frameCount - this.lastObstacleSpawnFrame;
        
        // Calculate random distance
        const randomDistance = Math.floor(Math.random() * (maxDistance - minDistance + 1)) + minDistance;
        
        if (framesSinceLastObstacle >= randomDistance) {
            // Randomly select stone graphic (1 or 2)
            const stoneType = Math.random() < 0.5 ? 1 : 2;
            
                         // Check if this should be a giant obstacle (every 10 obstacles, one random obstacle becomes giant)
             this.obstacleCount++;
             
             // Calculate which group we're in (1-10, 11-20, 21-30, etc.)
             const currentGroup = Math.ceil(this.obstacleCount / 10);
             const positionInGroup = this.obstacleCount % 10 || 10; // 1-10
             
             // If this is the first obstacle of a new group, determine which position will be giant
             if (positionInGroup === 1) {
                 this.currentGroupGiantPosition = Math.floor(Math.random() * 10) + 1; // Random 1-10
                 console.log(`🎯 Group ${currentGroup}: Giant obstacle will be at position ${this.currentGroupGiantPosition}`);
             }
             
             // Check if this obstacle should be giant based on its position in the group
             const shouldBeGiant = positionInGroup === this.currentGroupGiantPosition;
            
            const obstacle = {
                x: this.width,
                y: this.ground - 72, // Position adjustment for 10% reduced height (80 * 0.9 = 72)
                width: 54,  // 10% reduced (60 * 0.9 = 54)
                height: 72, // 10% reduced (80 * 0.9 = 72)
                passed: false,
                stoneType: stoneType, // Specify which stone graphic to use
                isGiant: shouldBeGiant, // Mark if this obstacle should become giant
                giantActivated: false // Track if giant effect has been activated
            };
            this.obstacles.push(obstacle);
            
            // Update last obstacle spawn frame
            this.lastObstacleSpawnFrame = this.frameCount;
            
                         // Debug information
             if (shouldBeGiant) {
                 console.log(`🚀 GIANT OBSTACLE #${this.obstacleCount} created! (Group ${currentGroup}, Position ${positionInGroup}) Will become 1.5x size at 200 frames distance`);
             } else {
                 console.log(`Obstacle #${this.obstacleCount} created! (Group ${currentGroup}, Position ${positionInGroup}) Distance: ${randomDistance} frames`);
             }
        }
    }
    
    spawnBonus() {
        if (this.frameCount % this.bonusSpawnRate === 0) {
            // Set bonus dimensions in original proportions
            const bonusWidth = 40; // Width
            const bonusHeight = 40; // Height (same as width - square format)
            
            const bonus = {
                x: this.width,
                y: this.ground - 140, // Height that can be reached by jumping (adjusted for larger ground)
                width: bonusWidth,
                height: bonusHeight,
                collected: false
            };
            this.bonuses.push(bonus);
        }
    }
    
    updateObstacles() {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            // Move obstacle to the left with dynamic speed
            obstacle.x -= this.obstacleSpeed * this.currentObstacleSpeedMultiplier;
            
            // Check if giant obstacle should activate (when 200 frames away from player)
            if (obstacle.isGiant && !obstacle.giantActivated) {
                const distanceToPlayer = this.player.x - obstacle.x;
                if (distanceToPlayer <= this.giantObstacleDistance) {
                    obstacle.giantActivated = true;
                    console.log(`🚀 GIANT OBSTACLE ACTIVATED! Distance: ${Math.round(distanceToPlayer)} frames`);
                }
            }
            
            // Remove obstacles that exit the screen
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
                continue;
            }
            
                         // Score increase
             if (!obstacle.passed && obstacle.x + obstacle.width < this.player.x) {
                 obstacle.passed = true;
                 
                 // Giant obstacles give 2 points, normal obstacles give 1 point
                 if (obstacle.isGiant && obstacle.giantActivated) {
                     this.score += 2;
                     console.log(`🚀 Giant obstacle passed! +2 points (Total: ${this.score})`);
                 } else {
                     this.score += 1;
                 }
                 
                 this.updateUI();
             }
            
            // Collision check
            if (this.checkObstacleCollision(this.player, obstacle)) {
                this.endGame();
            }
        }
        
        // Update optimum logo position (move with obstacles)
        if (this.optimumLogo && this.optimumLogo.visible) {
            this.optimumLogo.x -= this.obstacleSpeed * this.currentObstacleSpeedMultiplier;
            
            // Calculate actual logo width in pixels
            const actualLogoWidth = this.optimumLogo.width * this.optimumSprite.naturalWidth;
            
            // Hide logo when it completely exits the screen
            if (this.optimumLogo.x + actualLogoWidth < 0) {
                this.optimumLogo.visible = false;
            }
        }
    }
    
    updateBonuses() {
        for (let i = this.bonuses.length - 1; i >= 0; i--) {
            const bonus = this.bonuses[i];
            
            // Move bonus to the left with dynamic speed
            bonus.x -= this.obstacleSpeed * this.currentObstacleSpeedMultiplier;
            
            // Remove bonuses that exit the screen
            if (bonus.x + bonus.width < 0) {
                this.bonuses.splice(i, 1);
                continue;
            }
            
            // Bonus collection check
            if (!bonus.collected && this.checkBonusCollision(this.player, bonus)) {
                bonus.collected = true;
                this.score += 3; // Bonus points
                this.opti += 1; // $OPTI value increases by 1
                localStorage.setItem('opti', this.opti.toString()); // saved to localStorage
                this.updateUI();
                console.log('Bonus collected! +3 points, +1 $OPTI');
            }
        }
    }
    
    updateClouds() {
        // Move clouds to the left (50% slower than obstacles)
        this.clouds.forEach((cloud, index) => {
            cloud.x -= cloud.speed;
            
            // Move cloud to right side when it exits left side of screen
            if (cloud.x + cloud.width < 0) {
                // Position cloud at the right edge of the screen with some random offset
                cloud.x = this.width + Math.random() * 200; // Random position on right side
                cloud.y = 50 + Math.random() * 100; // Random height variation
                
                console.log(`Cloud ${index + 1} repositioned from right side at x=${cloud.x}`);
            }
        });
    }
    
    checkObstacleCollision(player, obstacle) {
        // Collision check - using 60% of area
        const playerCollisionWidth = player.width * 0.60;  // 60% of character
        const playerCollisionHeight = player.height * 0.60; // 60% of character
        
        // Character center
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        // Obstacle center (for oval shape)
        const obstacleCenterX = obstacle.x + obstacle.width / 2;
        const obstacleCenterY = obstacle.y + obstacle.height / 2;
        
        // Oval collision area for obstacle (fixed according to old dimensions: 60x80)
        const obstacleCollisionRadiusX = (60 * 0.60) / 2; // Old width: 60px
        const obstacleCollisionRadiusY = (80 * 0.60) / 2; // Old height: 80px
        
        // Rectangular collision area for character
        const playerCollisionHalfWidth = playerCollisionWidth / 2;
        const playerCollisionHalfHeight = playerCollisionHeight / 2;
        
        // Calculate corners of character's collision area
        const playerLeft = playerCenterX - playerCollisionHalfWidth;
        const playerRight = playerCenterX + playerCollisionHalfWidth;
        const playerTop = playerCenterY - playerCollisionHalfHeight;
        const playerBottom = playerCenterY + playerCollisionHalfHeight;
        
        // Oval collision check - are character's corners inside the oval area?
        // Top left corner
        if (this.isPointInOval(playerLeft, playerTop, obstacleCenterX, obstacleCenterY, obstacleCollisionRadiusX, obstacleCollisionRadiusY)) {
            return true;
        }
        // Top right corner
        if (this.isPointInOval(playerRight, playerTop, obstacleCenterX, obstacleCenterY, obstacleCollisionRadiusX, obstacleCollisionRadiusY)) {
            return true;
        }
        // Bottom left corner
        if (this.isPointInOval(playerLeft, playerBottom, obstacleCenterX, obstacleCenterY, obstacleCollisionRadiusX, obstacleCollisionRadiusY)) {
            return true;
        }
        // Bottom right corner
        if (this.isPointInOval(playerRight, playerBottom, obstacleCenterX, obstacleCenterY, obstacleCollisionRadiusX, obstacleCollisionRadiusY)) {
            return true;
        }
        
        return false;
    }
    
    // Helper function to check if a point is inside an oval
    isPointInOval(pointX, pointY, centerX, centerY, radiusX, radiusY) {
        const dx = pointX - centerX;
        const dy = pointY - centerY;
        return (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1;
    }
    
    checkBonusCollision(player, bonus) {
        // Simple collision check for bonus collection
        return player.x < bonus.x + bonus.width &&
               player.x + player.width > bonus.x &&
               player.y < bonus.y + bonus.height &&
               player.y + player.height > bonus.y;
    }
    
    endGame() {
        console.log('=== GAME ENDED ===');
        console.log('Final score:', this.score);
        console.log('Username:', this.username);
        
        this.gameRunning = false;
        this.gameOver = true;
        
        // Play death sound
        this.playDeathSound();
        
        // Stop background music
        this.stopBackgroundMusic();
        
        // Save score to leaderboard
        console.log('Calling saveToLeaderboard...');
        this.saveToLeaderboard(this.username, this.score);
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'block';
        
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('opti').textContent = this.opti;
    }
    
    draw() {
        // Clear background
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw ground - 2x larger
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.ground, this.width, this.height - this.ground);
        
        // Grass on ground - 2x larger
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.ground - 10, this.width, 10);
        
        // Draw main character (PNG sprite animation)
        if (this.sprite1.complete && this.sprite2.complete) {
            // Draw PNG sprites
            this.drawSpriteAnimation();
        } else {
            // Draw simple character until sprites load
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
            
            // Character face
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(this.player.x + 8, this.player.y + 8, 8, 8);
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(this.player.x + 10, this.player.y + 10, 2, 2);
            this.ctx.fillRect(this.player.x + 16, this.player.y + 10, 2, 2);
        }
        
        // Draw obstacles
        if (this.obstacleSprite1.complete && this.obstacleSprite2.complete) {
            this.obstacles.forEach(obstacle => {
                // Determine which stone graphic to use
                const currentSprite = obstacle.stoneType === 1 ? this.obstacleSprite1 : this.obstacleSprite2;
                
                // Calculate dimensions - giant obstacles are 2x size when activated
                let drawWidth = obstacle.width;
                let drawHeight = obstacle.height;
                
                if (obstacle.isGiant && obstacle.giantActivated) {
                    drawWidth *= 2;
                    drawHeight *= 2;
                }
                
                // Draw while preserving original proportions
                const aspectRatio = currentSprite.naturalWidth / currentSprite.naturalHeight;
                
                // If graphic is rectangular, preserve proportions
                if (aspectRatio !== 1) {
                    if (aspectRatio > 1) {
                        // Width is larger
                        drawHeight = drawWidth / aspectRatio;
                    } else {
                        // Height is larger
                        drawWidth = drawHeight * aspectRatio;
                    }
                }
                
                                 // Calculate positioning - giant obstacles should align bottom with normal obstacles
                 let offsetX, offsetY;
                 
                 if (obstacle.isGiant && obstacle.giantActivated) {
                     // For giant obstacles: center horizontally, align bottom vertically
                     // Giant obstacles are now 1.5x size (2x * 0.75 = 1.5x) instead of 2x
                     drawWidth = obstacle.width * 1.5;
                     drawHeight = obstacle.height * 1.5;
                     offsetX = (obstacle.width - drawWidth) / 2;
                     offsetY = obstacle.height - drawHeight; // Align bottom
                 } else {
                     // For normal obstacles: center both horizontally and vertically
                     offsetX = (obstacle.width - drawWidth) / 2;
                     offsetY = (obstacle.height - drawHeight) / 2;
                 }
                
                // Add glow effect for giant obstacles
                if (obstacle.isGiant && obstacle.giantActivated) {
                    this.ctx.save();
                    this.ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
                    this.ctx.shadowBlur = 15;
                    this.ctx.shadowOffsetX = 0;
                    this.ctx.shadowOffsetY = 0;
                }
                
                this.ctx.drawImage(
                    currentSprite, 
                    obstacle.x + offsetX, 
                    obstacle.y + offsetY, 
                    drawWidth, 
                    drawHeight
                );
                
                if (obstacle.isGiant && obstacle.giantActivated) {
                    this.ctx.restore();
                }
            });
        } else {
            // Draw simple obstacle until obstacle sprites load
            this.ctx.fillStyle = '#8B0000';
            this.obstacles.forEach(obstacle => {
                let drawWidth = obstacle.width;
                let drawHeight = obstacle.height;
                let drawX = obstacle.x;
                let drawY = obstacle.y;
                
                                 // Giant obstacles are 1.5x size when activated (25% smaller than before)
                 if (obstacle.isGiant && obstacle.giantActivated) {
                     drawWidth = obstacle.width * 1.5;
                     drawHeight = obstacle.height * 1.5;
                     // Align bottom for giant obstacles
                     drawY = obstacle.y + obstacle.height - drawHeight;
                 }
                
                this.ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
                
                // Obstacle details
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fillRect(drawX + 5, drawY + 5, 20, 10);
                this.ctx.fillStyle = '#8B0000';
            });
        }
        
        // Draw bonuses
        if (this.bonusSprite.complete) {
            this.bonuses.forEach(bonus => {
                if (!bonus.collected) {
                    // Draw bubble effect first
                    this.ctx.save();
                    
                    // Create bubble gradient
                    const bubbleGradient = this.ctx.createRadialGradient(
                        bonus.x + bonus.width/2, bonus.y + bonus.height/2, 0,
                        bonus.x + bonus.width/2, bonus.y + bonus.height/2, bonus.width/2 + 10
                    );
                    bubbleGradient.addColorStop(0, 'rgba(185, 124, 255, 0.8)');
                    bubbleGradient.addColorStop(0.7, 'rgba(185, 124, 255, 0.5)');
                    bubbleGradient.addColorStop(1, 'rgba(185, 124, 255, 0.1)');
                    
                    // Draw bubble background
                    this.ctx.fillStyle = bubbleGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(bonus.x + bonus.width/2, bonus.y + bonus.height/2, bonus.width/2 + 8, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Draw bubble border
                    this.ctx.strokeStyle = 'rgba(185, 124, 255, 0.9)';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                    
                    // Add bubble highlight
                    this.ctx.fillStyle = 'rgba(185, 124, 255, 0.3)';
                    this.ctx.beginPath();
                    this.ctx.arc(bonus.x + bonus.width/2 - 5, bonus.y + bonus.height/2 - 5, bonus.width/4, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.restore();
                    
                    // Draw while preserving original proportions
                    const aspectRatio = this.bonusSprite.naturalWidth / this.bonusSprite.naturalHeight;
                    let drawWidth = bonus.width;
                    let drawHeight = bonus.height;
                    
                    // If graphic is rectangular, preserve proportions
                    if (aspectRatio !== 1) {
                        if (aspectRatio > 1) {
                            // Width is larger
                            drawHeight = bonus.width / aspectRatio;
                        } else {
                            // Height is larger
                            drawWidth = bonus.height * aspectRatio;
                        }
                    }
                    
                    // Center align
                    const offsetX = (bonus.width - drawWidth) / 2;
                    const offsetY = (bonus.height - drawHeight) / 2;
                    
                    this.ctx.drawImage(
                        this.bonusSprite, 
                        bonus.x + offsetX, 
                        bonus.y + offsetY, 
                        drawWidth, 
                        drawHeight
                    );
                }
            });
        } else {
            // Draw simple bonus with bubble effect until bonus sprite loads
            this.bonuses.forEach(bonus => {
                if (!bonus.collected) {
                    // Draw bubble effect
                    this.ctx.save();
                    
                    // Create bubble gradient
                    const bubbleGradient = this.ctx.createRadialGradient(
                        bonus.x + bonus.width/2, bonus.y + bonus.height/2, 0,
                        bonus.x + bonus.width/2, bonus.y + bonus.height/2, bonus.width/2 + 10
                    );
                    bubbleGradient.addColorStop(0, 'rgba(185, 124, 255, 0.8)');
                    bubbleGradient.addColorStop(0.7, 'rgba(185, 124, 255, 0.5)');
                    bubbleGradient.addColorStop(1, 'rgba(185, 124, 255, 0.1)');
                    
                    // Draw bubble background
                    this.ctx.fillStyle = bubbleGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(bonus.x + bonus.width/2, bonus.y + bonus.height/2, bonus.width/2 + 8, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Draw bubble border
                    this.ctx.strokeStyle = 'rgba(185, 124, 255, 0.9)';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                    
                    // Add bubble highlight
                    this.ctx.fillStyle = 'rgba(185, 124, 255, 0.3)';
                    this.ctx.beginPath();
                    this.ctx.arc(bonus.x + bonus.width/2 - 5, bonus.y + bonus.height/2 - 5, bonus.width/4, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.restore();
                    
                    // Draw bonus content
                    this.ctx.fillStyle = '#FFD700';
                    this.ctx.fillRect(bonus.x + 5, bonus.y + 5, bonus.width - 10, bonus.height - 10);
                    // Bonus sign
                    this.ctx.fillStyle = '#FF6B6B';
                    this.ctx.fillRect(bonus.x + 15, bonus.y + 15, 10, 10);
                }
            });
        }
        
        // Draw optimum logo
        if (this.optimumLogo && this.optimumLogo.visible && this.optimumSprite.complete) {
            // Calculate scaled dimensions (20% of original size)
            const logoWidth = this.optimumLogo.width * this.optimumSprite.naturalWidth;
            const logoHeight = this.optimumLogo.height * this.optimumSprite.naturalHeight;
            
            this.ctx.drawImage(
                this.optimumSprite,
                this.optimumLogo.x,
                this.optimumLogo.y,
                logoWidth,
                logoHeight
            );
            
            // Draw text below the logo (2 frames below)
            this.ctx.save();
            this.ctx.fillStyle = '#000000';
            this.ctx.font = 'bold 16px Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            this.ctx.shadowBlur = 2;
            this.ctx.shadowOffsetX = 1;
            this.ctx.shadowOffsetY = 1;
            
            const textX = this.optimumLogo.x + logoWidth / 2;
            const textY = this.optimumLogo.y + logoHeight + 20; // 2 frames (20px) below logo
            
            this.ctx.fillText('High-Performance Memory for the World Computer', textX, textY);
            this.ctx.restore();
        }
        
        // Clouds (background)
        this.drawClouds();
        
        // Game status messages removed
    }
    
    drawClouds() {
        // Use PNG cloud graphics
        if (this.cloudSprite1.complete && this.cloudSprite2.complete && this.cloudSprite3.complete) {
            // Draw animated clouds
            this.clouds.forEach(cloud => {
                this.ctx.drawImage(cloud.sprite, cloud.x, cloud.y, cloud.width, cloud.height);
            });
        } else {
            // Draw simple clouds until cloud graphics load
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            
            // Cloud 1 - Position according to new canvas size
            this.ctx.beginPath();
            this.ctx.arc(200, 120, 30, 0, Math.PI * 2);
            this.ctx.arc(250, 120, 35, 0, Math.PI * 2);
            this.ctx.arc(300, 120, 30, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Cloud 2 - Position according to new canvas size
            this.ctx.beginPath();
            this.ctx.arc(800, 90, 25, 0, Math.PI * 2);
            this.ctx.arc(850, 90, 30, 0, Math.PI * 2);
            this.ctx.arc(900, 90, 25, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Cloud 3 - Add extra cloud
            this.ctx.beginPath();
            this.ctx.arc(1100, 150, 20, 0, Math.PI * 2);
            this.ctx.arc(1130, 150, 25, 0, Math.PI * 2);
            this.ctx.arc(1160, 150, 20, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // updateAnimation function removed - GIF automatically animates
    
    update() {
        if (this.gameRunning && !this.gameOver && !this.gamePaused) {
            this.updatePlayer();
            this.updateObstacleSpeed();
            this.spawnObstacle();
            this.spawnBonus();
            this.updateObstacles();
            this.updateBonuses();
            this.updateClouds(); // Add cloud animation
            this.frameCount++;
            
            // Sprite animation update
            this.updateSpriteAnimation();
        }
    }
    

    
    updateSpriteAnimation() {
        this.animationCounter++;
        if (this.animationCounter >= this.animationSpeed) {
            this.currentSprite = (this.currentSprite + 1) % 2; // Changes between 0 and 1
            this.animationCounter = 0;
        }
    }
    
    drawSpriteAnimation() {
        if (this.currentSprite === 0) {
            // Draw 1.png sprite
            this.ctx.drawImage(this.sprite1, this.player.x, this.player.y, this.player.width, this.player.height);
        } else {
            // Draw 2.png sprite
            this.ctx.drawImage(this.sprite2, this.player.x, this.player.y, this.player.width, this.player.height);
        }
    }
    
    showUsername() {
        // Remove existing username display if any
        this.hideUsername();
        
        // Create username display element
        const usernameDisplay = document.createElement('div');
        usernameDisplay.className = 'username-display';
        usernameDisplay.textContent = this.username;
        usernameDisplay.id = 'usernameDisplay';
        
        // Add to canvas container
        document.querySelector('.canvas-container').appendChild(usernameDisplay);
    }
    
    hideUsername() {
        const existingDisplay = document.getElementById('usernameDisplay');
        if (existingDisplay) {
            existingDisplay.remove();
        }
    }
    
    showUsernameError() {
        // Remove existing error if any
        this.hideUsernameError();
        
        // Create error message element
        const errorDisplay = document.createElement('div');
        errorDisplay.className = 'username-error';
        errorDisplay.textContent = 'Please enter your username first!';
        errorDisplay.id = 'usernameError';
        
        // Add to username input container
        const inputContainer = document.querySelector('.username-input-container');
        inputContainer.appendChild(errorDisplay);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.hideUsernameError();
        }, 3000);
        
        // Add shake animation to input field
        const usernameInput = document.getElementById('usernameInput');
        usernameInput.classList.add('shake');
        setTimeout(() => {
            usernameInput.classList.remove('shake');
        }, 500);
    }
    
    hideUsernameError() {
        const existingError = document.getElementById('usernameError');
        if (existingError) {
            existingError.remove();
        }
    }
    
    checkSavedUsername() {
        // If username exists in localStorage, auto-fill the input field
        if (this.username) {
            const usernameInput = document.getElementById('usernameInput');
            usernameInput.value = this.username;
            
            // Don't auto-start the game - let user click start button
            // setTimeout(() => {
            //     this.startGame();
            // }, 500); // Small delay to ensure everything is loaded
        }
    }
    
    showLeaderboard() {
        document.getElementById('leaderboardOverlay').style.display = 'flex';
        this.leaderboardVisible = true;
        
        // Show weekly leaderboard by default
        this.switchToWeeklyLeaderboard();
    }
    
    switchToWeeklyLeaderboard() {
        // Update button states
        document.getElementById('weeklyLbBtn').classList.add('active');
        document.getElementById('globalLbBtn').classList.remove('active');
        
        // Show weekly section, hide global section
        document.getElementById('weeklyLeaderboardSection').style.display = 'block';
        document.getElementById('globalLeaderboardSection').style.display = 'none';
        
        // Populate weekly leaderboard
        this.populateWeeklyLeaderboard();
    }
    
    switchToGlobalLeaderboard() {
        // Update button states
        document.getElementById('globalLbBtn').classList.add('active');
        document.getElementById('weeklyLbBtn').classList.remove('active');
        
        // Show global section, hide weekly section
        document.getElementById('globalLeaderboardSection').style.display = 'block';
        document.getElementById('weeklyLeaderboardSection').style.display = 'none';
        
        // Populate global leaderboard
        this.populateLeaderboard();
    }
    
    async populateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        const leaderboardLoading = document.getElementById('leaderboardLoading');
        
        // Show loading
        leaderboardLoading.style.display = 'flex';
        leaderboardList.style.display = 'none';
        
        try {
            // Check if Firebase is available
            if (!window.firebaseDB || !window.firebaseFunctions) {
                throw new Error('Firebase not initialized');
            }
            
            const { collection, query, orderBy, limit, onSnapshot } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Create real-time listener for top 10 scores only
            const q = query(
                collection(db, 'scores'), 
                orderBy('score', 'desc'), 
                limit(10)
            );
            
            // Set up real-time listener
            this.leaderboardUnsubscribe = onSnapshot(q, (querySnapshot) => {
                const scores = [];
                querySnapshot.forEach((doc) => {
                    scores.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                this.displayLeaderboard(scores);
            }, (error) => {
                console.error('Error fetching leaderboard:', error);
                this.showLeaderboardError('Failed to load leaderboard');
            });
            
        } catch (error) {
            console.error('Firebase error:', error);
            this.showLeaderboardError('Firebase not configured. Please check configuration.');
        }
    }
    
    displayLeaderboard(scores) {
        const leaderboardList = document.getElementById('leaderboardList');
        const leaderboardLoading = document.getElementById('leaderboardLoading');
        
        // Hide loading
        leaderboardLoading.style.display = 'none';
        leaderboardList.style.display = 'flex';
        
        leaderboardList.innerHTML = '';
        
        if (scores.length === 0) {
            leaderboardList.innerHTML = '<p style="color: rgba(255, 255, 255, 0.6); font-size: 1.1rem;">No scores yet. Be the first to play!</p>';
            return;
        }
        
        scores.forEach((entry, index) => {
            const rank = index + 1;
            const entryElement = document.createElement('div');
            entryElement.className = `leaderboard-entry rank-${rank}`;
            
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            if (rankClass) {
                entryElement.classList.add(rankClass);
            }
            
            // Medal emojis for top 3, numbers for others
            let rankDisplay;
            if (rank === 1) {
                rankDisplay = '🥇'; // Gold medal
            } else if (rank === 2) {
                rankDisplay = '🥈'; // Silver medal
            } else if (rank === 3) {
                rankDisplay = '🥉'; // Bronze medal
            } else {
                rankDisplay = `#${rank}`;
            }
            
            entryElement.innerHTML = `
                <div class="leaderboard-rank">${rankDisplay}</div>
                <div class="leaderboard-username">${entry.username}</div>
                <div class="leaderboard-score">${entry.score}</div>
            `;
            
            leaderboardList.appendChild(entryElement);
        });
    }
    
    showLeaderboardError(message) {
        const leaderboardList = document.getElementById('leaderboardList');
        const leaderboardLoading = document.getElementById('leaderboardLoading');
        
        leaderboardLoading.style.display = 'none';
        leaderboardList.style.display = 'flex';
        
        leaderboardList.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: #ff6b6b; font-size: 1.1rem; margin-bottom: 15px;">⚠️ ${message}</p>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.9rem;">
                    Please check your Firebase configuration in index.html
                </p>
            </div>
        `;
    }
    
    hideLeaderboard() {
        document.getElementById('leaderboardOverlay').style.display = 'none';
        this.leaderboardVisible = false;
        
        // Clean up Firebase listener to prevent memory leaks
        if (this.leaderboardUnsubscribe) {
            this.leaderboardUnsubscribe();
            this.leaderboardUnsubscribe = null;
        }
        
        // Clean up weekly leaderboard listener
        if (this.weeklyLeaderboardUnsubscribe) {
            this.weeklyLeaderboardUnsubscribe();
            this.weeklyLeaderboardUnsubscribe = null;
        }
    }
    
    showHowToPlay() {
        document.getElementById('howToPlayOverlay').style.display = 'flex';
        this.howToPlayVisible = true;
    }
    
    hideHowToPlay() {
        document.getElementById('howToPlayOverlay').style.display = 'none';
        this.howToPlayVisible = false;
    }
    
    // populateLeaderboard method removed - replaced with Firebase version above
    
    getLeaderboardData() {
        const leaderboard = localStorage.getItem('leaderboard');
        return leaderboard ? JSON.parse(leaderboard) : [];
    }
    
    async saveToLeaderboard(username, score) {
        try {
            console.log('=== SAVING TO LEADERBOARD ===');
            console.log('Username:', username);
            console.log('Score:', score);
            console.log('Firebase DB available:', !!window.firebaseDB);
            console.log('Firebase Functions available:', !!window.firebaseFunctions);
            
            // Check if Firebase is available
            if (!window.firebaseDB || !window.firebaseFunctions) {
                console.warn('Firebase not available, falling back to localStorage');
                this.saveToLeaderboardLocal(username, score);
                return;
            }

            console.log('Firebase connection test:', {
                firebaseDB: !!window.firebaseDB,
                firebaseFunctions: !!window.firebaseFunctions,
                functions: Object.keys(window.firebaseFunctions)
            });

            const { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } = window.firebaseFunctions;
            const db = window.firebaseDB;

            // Check if user already has a score
            const userQuery = query(
                collection(db, 'scores'),
                orderBy('username', 'asc')
            );
            
            const userSnapshot = await getDocs(userQuery);
            let userExists = false;
            let existingScore = 0;
            let existingDocId = null;

            userSnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                if (data.username === username) {
                    userExists = true;
                    existingScore = data.score;
                    existingDocId = docSnapshot.id;
                }
            });

            if (userExists) {
                // Update existing score only if new score is higher
                if (score > existingScore) {
                    // Delete old score and add new one
                    await deleteDoc(doc(db, 'scores', existingDocId));
                    await addDoc(collection(db, 'scores'), {
                        username: username,
                        score: score,
                        date: new Date().toISOString()
                    });
                    console.log(`Updated score for ${username}: ${existingScore} → ${score}`);
                } else {
                    console.log(`Score not updated for ${username}: ${score} ≤ ${existingScore}`);
                }
            } else {
                // Add new user score
                await addDoc(collection(db, 'scores'), {
                    username: username,
                    score: score,
                    date: new Date().toISOString()
                });
                console.log(`New score added for ${username}: ${score}`);
            }

            // Save to weekly leaderboard
            await this.saveToWeeklyLeaderboard(username, score);

        } catch (error) {
            console.error('Error saving to Firebase:', error);
            // Fallback to localStorage
            this.saveToLeaderboardLocal(username, score);
        }
    }
    
    saveToLeaderboardLocal(username, score) {
        const leaderboardData = this.getLeaderboardData();
        
        // Check if user already exists
        const existingUserIndex = leaderboardData.findIndex(entry => entry.username === username);
        
        if (existingUserIndex !== -1) {
            // User exists, update score only if new score is higher
            const existingScore = leaderboardData[existingUserIndex].score;
            if (score > existingScore) {
                leaderboardData[existingUserIndex] = {
                    username: username,
                    score: score,
                    date: new Date().toISOString()
                };
                console.log(`Updated localStorage score for ${username}: ${existingScore} → ${score}`);
            } else {
                console.log(`localStorage score not updated for ${username}: ${score} ≤ ${existingScore}`);
                return; // Don't save if score is not higher
            }
        } else {
            // New user, add to leaderboard
            const newEntry = {
                username: username,
                score: score,
                date: new Date().toISOString()
            };
            leaderboardData.push(newEntry);
            console.log(`New localStorage score added for ${username}: ${score}`);
        }
        
        // Sort by score (highest first) and keep only top 100
        leaderboardData.sort((a, b) => b.score - a.score);
        if (leaderboardData.length > 100) {
            leaderboardData.length = 100;
        }
        
        localStorage.setItem('leaderboard', JSON.stringify(leaderboardData));
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    // Weekly Leaderboard Functions
    // REMOVED - Will be reimplemented from scratch
    
    // NEW: Basic Weekly Leaderboard Functions
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0); // Reset time to start of day
        return weekStart;
    }
    
    async saveToWeeklyLeaderboard(username, score) {
        try {
            console.log('=== SAVING TO WEEKLY LEADERBOARD ===');
            console.log('Username:', username);
            console.log('Score:', score);
            
            if (!window.firebaseDB || !window.firebaseFunctions) {
                console.warn('Firebase not available for weekly leaderboard');
                return;
            }

            const { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, where } = window.firebaseFunctions;
            const db = window.firebaseDB;

            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            
            console.log('Week start:', weekStart.toISOString());

            // Check if user already has a weekly score for this week
            const weeklyQuery = query(
                collection(db, 'weekly_scores'),
                where('username', '==', username),
                where('weekStart', '==', weekStart.toISOString())
            );
            
            const weeklySnapshot = await getDocs(weeklyQuery);
            let userExists = false;
            let existingScore = 0;
            let existingDocId = null;

            weeklySnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                if (data.username === username) {
                    userExists = true;
                    existingScore = data.score;
                    existingDocId = docSnapshot.id;
                }
            });

            if (userExists) {
                // Update existing score only if new score is higher
                if (score > existingScore) {
                    // Delete old score and add new one
                    await deleteDoc(doc(db, 'weekly_scores', existingDocId));
                    await addDoc(collection(db, 'weekly_scores'), {
                        username: username,
                        score: score,
                        weekStart: weekStart.toISOString(),
                        date: new Date().toISOString()
                    });
                    console.log(`Updated weekly score for ${username}: ${existingScore} → ${score}`);
                } else {
                    console.log(`Weekly score not updated for ${username}: ${score} ≤ ${existingScore}`);
                }
            } else {
                // Add new user weekly score
                await addDoc(collection(db, 'weekly_scores'), {
                    username: username,
                    score: score,
                    weekStart: weekStart.toISOString(),
                    date: new Date().toISOString()
                });
                console.log(`New weekly score added for ${username}: ${score}`);
            }

        } catch (error) {
            console.error('Error saving to weekly leaderboard:', error);
        }
    }
    
    async populateWeeklyLeaderboard() {
        console.log('=== POPULATING WEEKLY LEADERBOARD ===');
        
        const weeklyLeaderboardList = document.getElementById('weeklyLeaderboardList');
        const weeklyLeaderboardLoading = document.getElementById('weeklyLeaderboardLoading');
        
        // Show loading
        weeklyLeaderboardLoading.style.display = 'flex';
        weeklyLeaderboardList.style.display = 'none';
        
        try {
            if (!window.firebaseDB || !window.firebaseFunctions) {
                throw new Error('Firebase not initialized');
            }
            
            const { collection, query, orderBy, limit, onSnapshot, where } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            console.log('Current week start:', weekStart.toISOString());
            
            // Use real-time listener with where clause
            const q = query(
                collection(db, 'weekly_scores'),
                where('weekStart', '==', weekStart.toISOString()),
                orderBy('score', 'desc'),
                limit(20)
            );
            
            console.log('Real-time query created successfully');
            
            // Set up real-time listener
            this.weeklyLeaderboardUnsubscribe = onSnapshot(q, (querySnapshot) => {
                const scores = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log('Real-time document data:', data);
                    scores.push({
                        id: doc.id,
                        ...data
                    });
                });
                
                console.log('Real-time weekly scores for current week:', scores.length);
                this.displayWeeklyLeaderboard(scores);
            }, (error) => {
                console.error('Real-time listener error:', error);
                // Fallback to getDocs if index is not ready
                this.populateWeeklyLeaderboardFallback();
            });
            
        } catch (error) {
            console.error('Firebase error in populateWeeklyLeaderboard:', error);
            this.showWeeklyLeaderboardError('Weekly leaderboard not available yet');
        }
    }
    
    // Fallback method using getDocs (no index required)
    async populateWeeklyLeaderboardFallback() {
        console.log('=== USING FALLBACK METHOD ===');
        
        try {
            const { collection, query, orderBy, limit, getDocs } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            
            const q = query(
                collection(db, 'weekly_scores'),
                orderBy('score', 'desc'),
                limit(20)
            );
            
            const querySnapshot = await getDocs(q);
            const scores = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.weekStart === weekStart.toISOString()) {
                    scores.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
            
            this.displayWeeklyLeaderboard(scores);
            
        } catch (error) {
            console.error('Fallback method error:', error);
            this.showWeeklyLeaderboardError('Weekly leaderboard not available yet');
        }
    }
    
    displayWeeklyLeaderboard(scores) {
        const weeklyLeaderboardList = document.getElementById('weeklyLeaderboardList');
        const weeklyLeaderboardLoading = document.getElementById('weeklyLeaderboardLoading');
        
        // Hide loading
        weeklyLeaderboardLoading.style.display = 'none';
        weeklyLeaderboardList.style.display = 'flex';
        
        weeklyLeaderboardList.innerHTML = '';
        
        if (scores.length === 0) {
            weeklyLeaderboardList.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 1rem;">No scores this week yet. Be the first!</p>
                </div>
            `;
            return;
        }
        
        scores.forEach((entry, index) => {
            const rank = index + 1;
            const entryElement = document.createElement('div');
            entryElement.className = `leaderboard-entry rank-${rank}`;
            
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            if (rankClass) {
                entryElement.classList.add(rankClass);
            }
            
            // Medal emojis for top 3, numbers for others
            let rankDisplay;
            if (rank === 1) {
                rankDisplay = '🥇';
            } else if (rank === 2) {
                rankDisplay = '🥈';
            } else if (rank === 3) {
                rankDisplay = '🥉';
            } else {
                rankDisplay = `#${rank}`;
            }
            
            entryElement.innerHTML = `
                <div class="leaderboard-rank">${rankDisplay}</div>
                <div class="leaderboard-username">${entry.username}</div>
                <div class="leaderboard-score">${entry.score}</div>
            `;
            
            weeklyLeaderboardList.appendChild(entryElement);
        });
        
        // Refresh button removed
    }
    
    showWeeklyLeaderboardError(message) {
        const weeklyLeaderboardList = document.getElementById('weeklyLeaderboardList');
        const weeklyLeaderboardLoading = document.getElementById('weeklyLeaderboardLoading');
        
        weeklyLeaderboardLoading.style.display = 'none';
        weeklyLeaderboardList.style.display = 'flex';
        
        weeklyLeaderboardList.innerHTML = `
            <div style="text-align: center; padding: 15px;">
                <p style="color: #ff6b6b; font-size: 1rem; margin-bottom: 10px;">⚠️ ${message}</p>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">
                    Weekly leaderboard is being set up
                </p>
            </div>
        `;
    }
    

    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game
window.addEventListener('load', () => {
    // Wait for Firebase to be ready
    if (window.firebaseReady) {
        new Game();
    } else {
        window.addEventListener('firebaseReady', () => {
            new Game();
        });
    }
});
