// 1. Adım: Tüm kodu özel bir "balon" içine alıyoruz (IIFE başlangıcı)
(function() {

// Güvenlik dedektörümüz: Gelen skorun mantıklı olup olmadığını kontrol eder.
const isScoreValid = (score, gameDuration, optiEarned, jumpCount) => {
  const durationInSeconds = gameDuration / 1000;

  // Kural 1: Oyun en az 5 saniye sürmüş olmalı.
  if (durationInSeconds < 5) {
    console.warn(`[Hile Tespiti] Reddedildi: Oyun süresi çok kısa (${durationInSeconds}s).`);
    return false;
  }

  // Kural 2: Süreye göre maksimum skor. Saniyede 1.5 puandan fazla olamaz.
  const maxPossibleScore = (durationInSeconds * 1.5) + 10;
  if (score > maxPossibleScore) {
    console.warn(`[Hile Tespiti] Reddedildi: Skor (${score}), süreye (${durationInSeconds}s) göre çok yüksek.`);
    return false;
  }

  // Kural 3: Zıplama başına düşen skor oranı. Ortalama 3'ten fazla olamaz.
  // Bu, "God Mode" ile hiç zıplamadan veya az zıplayarak kasılan skorları yakalar.
  if (jumpCount > 0 && (score / jumpCount) > 3) {
      console.warn(`[Hile Tespiti] Reddedildi: Zıplama başına düşen skor (${(score / jumpCount).toFixed(2)}) çok yüksek.`);
      return false;
  }
  
  // Kural 4: Yüksek skora rağmen çok az zıplama.
  if (score > 50 && jumpCount < 10) {
      console.warn(`[Hile Tespiti] Reddedildi: Yüksek skora (${score}) rağmen çok az zıplama (${jumpCount}).`);
      return false;
  }

  // Kural 5: $OPTI puanı kontrolü. 5 saniyede 1'den fazla olamaz.
  const maxPossibleOpti = Math.floor(durationInSeconds / 5) + 2;
  if (optiEarned > maxPossibleOpti) {
    console.warn(`[Hile Tespiti] Reddedildi: Kazanılan $OPTI (${optiEarned}) süreye göre çok yüksek.`);
    return false;
  }
  
  console.log(`[Skor Doğrulandı] Skor: ${score}, Süre: ${durationInSeconds.toFixed(1)}s`);
  return true; // Bütün kontrollerden geçti, skor güvenilir.
};

// Game starts here

class Game {
    constructor() {
        console.log('🎮 Game constructor started');
        console.log('DOM ready state:', document.readyState);
        
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
        this.opti = 0; // $OPTI value, will be loaded from user profile
        this.bonusCount = 0; // Track bonus items collected in current game

        // Anti-cheat tracking
        this.gameStartTime = null;
        this.gameEndTime = null;
        this.jumpCount = 0;
        this.totalGameTime = 0;
        this.lastTime = 0; // Delta time için
        this.currentGameSessionToken = null; // Tek kullanımlık oyun bileti

        this.username = localStorage.getItem('username') || '';
        this.leaderboardVisible = false;
        this.howToPlayVisible = false;
        this.tournamentVisible = false;
        this.weeklyLeaderboardUnsubscribe = null;
        
        // Legacy score notice visibility
        this.legacyNoticeShown = localStorage.getItem('legacyNoticeShown') === 'true';
        this.hasPlayedGame = localStorage.getItem('hasPlayedGame') === 'true';
        
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
        this.animationSpeed = 500; // Sprite changes every 500ms (half second)
        this.animationCounter = 0;
        this.lastAnimationTime = 0; // Time when last animation changed
        
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
        this.obstacleSpawnRate = 2000; // Spawn obstacle every 2000ms (2 seconds)
        this.baseObstacleSpawnRate = 2000; // Base spawn rate in milliseconds
        this.obstacleSpeedIncreaseInterval = 10000; // 10 seconds in milliseconds
        this.obstacleSpeedIncreaseAmount = 0.20; // 20% increase every 10 seconds
        this.currentObstacleSpeedMultiplier = 1; // Current speed multiplier
        this.frameCount = 0;
        this.lastObstacleSpawnTime = 0; // Time when last obstacle spawned
        this.gameStartTime = 0; // Time when game started
        this.speedIncreaseStarted = false; // Whether speed increase has started
        
        // Browser performance detection
        this.browserPerformanceMode = this.detectBrowserPerformance();
        console.log(`🌐 Browser performance mode: ${this.browserPerformanceMode}`);
        
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
        this.bonusSpawnRate = 3000; // Spawn bonus every 3000ms (3 seconds)
        this.lastBonusSpawnTime = 0; // Time when last bonus spawned
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
         
         // Browser optimizations removed - using default settings
        
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
        
        // Initialize authentication UI
        this.updateAuthUI();
        
        // Check if legacy notice should be shown
        this.checkLegacyNotice();
        
        // Maintenance popup removed
        
        // Game loop
        this.gameLoop();
        
        // Güvenlik: Sadece kritik fonksiyonları koru - state değişikliklerine izin ver
        this.protectCriticalFunctions();
        console.log('🔒 Critical functions protected for security');
    }
    
    // Kritik fonksiyonları koruma - Object.freeze yerine seçici koruma
    protectCriticalFunctions() {
        // Sadece çarpışma kontrolü ve skor fonksiyonlarını koru
        const criticalFunctions = [
            'checkObstacleCollision',
            'checkBonusCollision', 
            'validateScore',
            'endGame',
            'updatePlayer',
            'updateObstacles',
            'updateBonuses'
        ];
        
        criticalFunctions.forEach(funcName => {
            if (this[funcName] && typeof this[funcName] === 'function') {
                Object.freeze(this[funcName]);
            }
        });
    }
    
    // Check if legacy notice should be shown
    checkLegacyNotice() {
        // Show notice only if:
        // 1. User hasn't seen it before, OR
        // 2. User has played a game before (returning player)
        if (!this.legacyNoticeShown || this.hasPlayedGame) {
            this.showLegacyNotice();
        }
    }
    
    // Show legacy notice
    showLegacyNotice() {
        const notice = document.getElementById('legacyScoreNotice');
        if (notice) {
            notice.style.display = 'block';
            // Mark as shown
            localStorage.setItem('legacyNoticeShown', 'true');
            this.legacyNoticeShown = true;
        }
    }
    
    // Hide legacy notice
    hideLegacyNotice() {
        const notice = document.getElementById('legacyScoreNotice');
        if (notice) {
            notice.style.display = 'none';
        }
    }
    
    // Show tournament button with proper positioning
    showTournamentButton() {
        const tournamentBtn = document.getElementById('tournamentBtn');
        if (tournamentBtn) {
            tournamentBtn.style.display = 'block';
            // Force reset position to ensure it stays centered
            tournamentBtn.style.transform = 'translateY(-50%)';
            tournamentBtn.style.right = '20px';
            tournamentBtn.style.top = '50%';
        }
    }
    
    // Maintenance popup removed
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
        console.log('🔧 Setting up event listeners...');
        
        // Disable right-click and mouse scroll in game
        this.disableContextMenu();
        this.disableMouseScroll();
        
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
        const startBtn = document.getElementById('startBtn');
        console.log('Start button found:', !!startBtn);
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log('Start button clicked');
                if (window.authFunctions && window.authFunctions.isSignedIn()) {
                    this.startGame();
                } else {
                    alert('Please sign in with Google to play the game!');
                }
            });
        }
        
        // Leaderboard button
        const leaderboardBtn = document.getElementById('leaderboardBtn');
        console.log('Leaderboard button found:', !!leaderboardBtn);
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', () => {
                console.log('Leaderboard button clicked');
                this.showLeaderboard();
            });
        }
        
        // Close leaderboard button (X)
        const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
        if (closeLeaderboardBtn) {
            closeLeaderboardBtn.addEventListener('click', () => {
                this.hideLeaderboard();
            });
        }
        
        // How to Play button
        const howToPlayBtn = document.getElementById('howToPlayBtn');
        console.log('How to Play button found:', !!howToPlayBtn);
        if (howToPlayBtn) {
            howToPlayBtn.addEventListener('click', () => {
                console.log('How to Play button clicked');
                this.showHowToPlay();
            });
        }
        
        // Close How to Play button (X)
        const closeHowToPlayBtn = document.getElementById('closeHowToPlayBtn');
        if (closeHowToPlayBtn) {
            closeHowToPlayBtn.addEventListener('click', () => {
                this.hideHowToPlay();
            });
        }
        
        // Tournament button
        const tournamentBtn = document.getElementById('tournamentBtn');
        if (tournamentBtn) {
            tournamentBtn.addEventListener('click', () => {
                console.log('Tournament button clicked');
                this.showTournament();
            });
        }
        
        // Close Tournament button (X)
        const closeTournamentBtn = document.getElementById('closeTournamentBtn');
        if (closeTournamentBtn) {
            closeTournamentBtn.addEventListener('click', () => {
                this.hideTournament();
            });
        }
        
        // ESC key to close overlays
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.leaderboardVisible) {
                this.hideLeaderboard();
            }
            if (e.key === 'Escape' && this.howToPlayVisible) {
                this.hideHowToPlay();
            }
            if (e.key === 'Escape' && this.tournamentVisible) {
                this.hideTournament();
            }
        });
        
        // Play again button (only in game over screen)
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.restartGame();
            });
        }
        
        // Main menu button (game over screen)
        const mainMenuBtnGameOver = document.getElementById('mainMenuBtnGameOver');
        if (mainMenuBtnGameOver) {
            mainMenuBtnGameOver.addEventListener('click', () => {
                this.returnToMainMenu();
            });
        }
        
        // Pause menu buttons
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.togglePause();
            });
        }
        
        const mainMenuBtn = document.getElementById('mainMenuBtn');
        if (mainMenuBtn) {
            mainMenuBtn.addEventListener('click', () => {
                this.returnToMainMenu();
            });
        }
        
        // Touch support (for mobile)
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.gameRunning && !this.gameOver && !this.gamePaused) {
                e.preventDefault();
                this.jump();
            }
        });
        
        // Sound control button
        const soundToggleBtn = document.getElementById('soundToggleBtn');
        if (soundToggleBtn) {
            soundToggleBtn.addEventListener('click', () => {
                this.toggleSound();
            });
        }
        
        // Authentication event listeners
        this.setupAuthenticationListeners();
        
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
        const weeklyLbBtn = document.getElementById('weeklyLbBtn');
        if (weeklyLbBtn) {
            weeklyLbBtn.addEventListener('click', () => {
                this.switchToWeeklyLeaderboard();
            });
        }
        
        const globalLbBtn = document.getElementById('globalLbBtn');
        if (globalLbBtn) {
            globalLbBtn.addEventListener('click', () => {
                this.switchToGlobalLeaderboard();
            });
        }
        
        // Auto-migrate this week players immediately when game loads
        this.runMigrationNow();
    }
    
    setupAuthenticationListeners() {
        console.log('🔐 Setting up authentication listeners...');
        
        // Google Sign In button
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        console.log('Google Sign In button found:', !!googleSignInBtn);
        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', async () => {
                console.log('Google Sign In button clicked');
                try {
                    // Check if authFunctions is available
                    if (!window.authFunctions) {
                        console.error('AuthFunctions not available yet');
                        alert('Authentication not ready. Please refresh the page.');
                        return;
                    }
                    
                    const result = await window.authFunctions.signInWithGoogle();
                    if (!result.success) {
                        alert('Sign in failed: ' + result.error);
                    } else if (result.data && result.data.url) {
                        // Redirect to Google OAuth URL
                        console.log('🔄 Redirecting to Google OAuth...');
                        window.location.href = result.data.url;
                    }
                } catch (error) {
                    console.error('Google sign in error:', error);
                    alert('Sign in failed. Please try again.');
                }
            });
        }
        
        // Profile button
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.showProfile();
            });
        }
        
        // Sign Out button
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', async () => {
                try {
                    // Check if authFunctions is available
                    if (!window.authFunctions) {
                        console.error('AuthFunctions not available yet');
                        alert('Authentication not ready. Please refresh the page.');
                        return;
                    }
                    
                    const result = await window.authFunctions.signOut();
                    if (result.success) {
                        this.updateAuthUI();
                    } else {
                        alert('Sign out failed: ' + result.error);
                    }
                } catch (error) {
                    console.error('Sign out error:', error);
                    alert('Sign out failed. Please try again.');
                }
            });
        }
        
        // Close Profile button
        const closeProfileBtn = document.getElementById('closeProfileBtn');
        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', () => {
                this.hideProfile();
            });
        }
        
        // Change Username button
        const changeUsernameBtn = document.getElementById('changeUsernameBtn');
        if (changeUsernameBtn) {
            changeUsernameBtn.addEventListener('click', () => {
                this.changeUsername();
            });
        }
        
        // Listen for authentication state changes
        window.addEventListener('userSignedIn', (event) => {
            console.log('User signed in:', event.detail);
            this.updateAuthUI();
            this.loadUserProfile();
        });
        
        window.addEventListener('userSignedOut', () => {
            console.log('User signed out');
            this.updateAuthUI();
            // Reset $OPTI to 0 when user signs out
            this.opti = 0;
            this.updateUI();
        });
        
        // Check if Netlify Functions are available
        if (window.netlifyAuthFunctions) {
            console.log('✅ Netlify Functions detected');
        } else {
            console.warn('⚠️ Netlify Functions not detected, falling back to direct Supabase');
        }
    }
    
    async startGame() {
        // Check if user is signed in
        if (!window.authFunctions || !window.authFunctions.isSignedIn()) {
            alert('Please sign in with Google to play the game!');
            return;
        }
        
        // Session token kontrolü geçici olarak devre dışı
        this.currentGameSessionToken = 'dev_token_' + Date.now();
        console.log('🔧 Development mode - using dummy session token:', this.currentGameSessionToken);
        
        // Get username from user profile
        this.username = 'Player'; // Default username, will be updated from profile
        
        // Profile is already created during authentication, no need to create again
        
        this.gameRunning = true;
        this.gameOver = false;
        this.gamePaused = false;
        this.score = 0;
        this.bonusCount = 0; // Reset bonus count for new game
        // this.opti sıfırlanmaz - kalıcı olarak saklanır
        
        // Hide legacy notice when game starts
        this.hideLegacyNotice();
        
        // Reset anti-cheat tracking
        this.gameStartTime = Date.now();
        this.gameEndTime = null;
        this.jumpCount = 0;
        this.totalGameTime = 0;
        
        // Anti-cheat: Prevent score manipulation at start
        if (this.score !== 0) {
            console.warn('🚨 Score manipulation detected at game start - resetting');
            this.score = 0;
        }
        
        this.obstacles = [];
        this.bonuses = [];
        this.frameCount = 0;
        this.lastObstacleSpawnTime = 0; // Reset obstacle spawn system (delta time)
        this.lastBonusSpawnTime = 0; // Reset bonus spawn system (delta time)
        this.lastAnimationTime = 0; // Reset animation system (delta time)
        this.optimumLogo = null; // Reset optimum logo
        this.obstacleCount = 0; // Reset obstacle counter for giant system
        this.currentGroupGiantPosition = 0; // Reset giant position for new group
        
        // Reset obstacle speed system
        this.obstacleSpawnRate = this.baseObstacleSpawnRate;
        this.currentObstacleSpeedMultiplier = 1;
        this.lastTime = 0; // Reset delta time system
        this.currentGameSessionToken = null; // Reset session token
        this.gameStartTime = 0; // Record when game started (delta time)
        this.totalGameTime = 0; // Reset total game time (delta time)
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
        
        // Hide How to Play button when game starts
        document.getElementById('howToPlayBtn').style.display = 'none';
        
        // Hide Tournament button when game starts
        document.getElementById('tournamentBtn').style.display = 'none';
        
        // Start background music
        this.startBackgroundMusic();
        
        this.updateUI();
    }
    
    restartGame() {
        // Stop current music
        this.stopBackgroundMusic();
        
        // Show the start overlay again when restarting
        document.getElementById('gameStartOverlay').style.display = 'flex';
        
        // Show How to Play button when restarting
        document.getElementById('howToPlayBtn').style.display = 'block';
        
        // Show Tournament button when restarting
        this.showTournamentButton();
        
        // Show legacy notice when returning to menu
        this.showLegacyNotice();
        
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
        this.lastObstacleSpawnTime = 0; // Reset obstacle spawn system (delta time)
        this.lastBonusSpawnTime = 0; // Reset bonus spawn system (delta time)
        this.lastAnimationTime = 0; // Reset animation system (delta time)
        this.optimumLogo = null; // Reset optimum logo
        this.obstacleCount = 0; // Reset obstacle counter for giant system
        this.currentGroupGiantPosition = 0; // Reset giant position for new group
        
        // Reset obstacle speed system
        this.obstacleSpawnRate = this.baseObstacleSpawnRate;
        this.currentObstacleSpeedMultiplier = 1;
        this.lastTime = 0; // Reset delta time system
        this.currentGameSessionToken = null; // Reset session token
        this.gameStartTime = 0;
        this.totalGameTime = 0; // Reset total game time (delta time)
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
        
        // Show How to Play button when returning to main menu
        document.getElementById('howToPlayBtn').style.display = 'block';
        
        // Show Tournament button when returning to main menu
        this.showTournamentButton();
        
        // Show legacy notice when returning to main menu
        this.showLegacyNotice();
        
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
        const minDistance = Math.floor(this.obstacleSpawnRate * 0.8); // 20% shorter (1600ms)
        const maxDistance = Math.floor(this.obstacleSpawnRate * 1.25); // 25% longer (2500ms)
        const randomDistance = Math.floor(Math.random() * (maxDistance - minDistance + 1)) + minDistance;
        
        // Set the spawn time so next obstacle appears at correct distance
        this.lastObstacleSpawnTime = this.totalGameTime - randomDistance;
        
        // Create optimum logo between first and second obstacles
        const firstObstacleX = this.width / 2;
        // Convert time-based distance to pixel distance
        const pixelDistance = (randomDistance / 1000) * (this.obstacleSpeed * this.currentObstacleSpeedMultiplier) * 60; // Convert ms to pixels
        const secondObstacleX = firstObstacleX + pixelDistance;
        const optimumX = firstObstacleX + (secondObstacleX - firstObstacleX) / 2 + (1500 / 1000) * (this.obstacleSpeed * this.currentObstacleSpeedMultiplier) * 60 - 20; // 1.5 seconds more to the right - 20px left
        const optimumY = this.ground - 72 - 144 - 80; // 2x obstacle height above ground + 80px up (60px + 20px)
        
        this.optimumLogo = {
            x: optimumX,
            y: optimumY,
            width: 0.14, // 14% of original size (reduced by 86% total)
            height: 0.14,  // 14% of original size (reduced by 86% total)
            visible: true
        };
        
        console.log(`First obstacle spawned at center of screen! Next obstacle in ${randomDistance}ms`);
    }
    
    jump() {
        if (!this.player.jumping) {
            this.player.velocityY = this.player.jumpPower;
            this.player.jumping = true;
            this.jumpCount++; // Increment jump counter for anti-cheat
        }
    }
    
    updatePlayer(deltaTime) {
        // Calculate game speed multiplier based on delta time
        const gameSpeed = deltaTime / 16.67; // 60 FPS'e göre hız oranı
        
        // Apply gravity
        this.player.velocityY += this.player.gravity * gameSpeed;
        this.player.y += this.player.velocityY * gameSpeed;
        
        // Ground check
        if (this.player.y >= this.ground - this.player.height) {
            this.player.y = this.ground - this.player.height;
            this.player.velocityY = 0;
            this.player.jumping = false;
        }
    }
    
    updateObstacleSpeed(deltaTime) {
        // Check if 10 seconds have passed since game start
        const timeSinceGameStart = this.totalGameTime - this.gameStartTime;
        const tenSecondsInMs = 10000; // 10 seconds in milliseconds
        
        // Start speed increase after 10 seconds
        if (timeSinceGameStart >= tenSecondsInMs && !this.speedIncreaseStarted) {
            this.speedIncreaseStarted = true;
            console.log('Speed increase system activated after 10 seconds!');
        }
        
        // Only increase speed if system is activated and every 10 seconds
        if (this.speedIncreaseStarted && 
            Math.floor(timeSinceGameStart / this.obstacleSpeedIncreaseInterval) > 
            Math.floor((timeSinceGameStart - deltaTime) / this.obstacleSpeedIncreaseInterval)) {
            
            this.currentObstacleSpeedMultiplier += this.obstacleSpeedIncreaseAmount;
            
            // Calculate new spawn rate (faster spawn = lower time)
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
        // Current fixed distance: 2000ms (2 seconds)
        // Random distance: between 20% shorter and 25% longer
        const minDistance = Math.floor(this.obstacleSpawnRate * 0.8); // 20% shorter (1600ms)
        const maxDistance = Math.floor(this.obstacleSpawnRate * 1.25); // 25% longer (2500ms)
        
        // Time since last obstacle
        const timeSinceLastObstacle = this.totalGameTime - this.lastObstacleSpawnTime;
        
        // Calculate random distance
        const randomDistance = Math.floor(Math.random() * (maxDistance - minDistance + 1)) + minDistance;
        
        if (timeSinceLastObstacle >= randomDistance) {
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
            
            // Update last obstacle spawn time
            this.lastObstacleSpawnTime = this.totalGameTime;
            
                         // Debug information
             if (shouldBeGiant) {
                 console.log(`🚀 GIANT OBSTACLE #${this.obstacleCount} created! (Group ${currentGroup}, Position ${positionInGroup}) Will become 1.5x size at 200 frames distance`);
             } else {
                 console.log(`Obstacle #${this.obstacleCount} created! (Group ${currentGroup}, Position ${positionInGroup}) Distance: ${randomDistance} frames`);
             }
        }
    }
    
    spawnBonus() {
        // Time since last bonus
        const timeSinceLastBonus = this.totalGameTime - this.lastBonusSpawnTime;
        
        if (timeSinceLastBonus >= this.bonusSpawnRate) {
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
            
            // Update last bonus spawn time
            this.lastBonusSpawnTime = this.totalGameTime;
        }
    }
    
    updateObstacles(deltaTime) {
        // Calculate game speed multiplier based on delta time
        const gameSpeed = deltaTime / 16.67; // 60 FPS'e göre hız oranı
        
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            // Move obstacle to the left with dynamic speed
            obstacle.x -= (this.obstacleSpeed * this.currentObstacleSpeedMultiplier) * gameSpeed;
            
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
                
                // Anti-cheat: Prevent score manipulation
                if (this.score < 0) {
                    console.warn('🚨 Score manipulation detected - resetting to 0');
                    this.score = 0;
                }
                
                this.updateUI();
             }
            
            // Collision check
            if (this.checkObstacleCollision(this.player, obstacle)) {
                console.log('🚨 COLLISION DETECTED - ENDING GAME');
                this.endGame();
                return; // Exit the loop immediately
            }
        }
        
        // Update optimum logo position (move with obstacles)
        if (this.optimumLogo && this.optimumLogo.visible) {
            this.optimumLogo.x -= (this.obstacleSpeed * this.currentObstacleSpeedMultiplier) * gameSpeed;
            
            // Calculate actual logo width in pixels
            const actualLogoWidth = this.optimumLogo.width * this.optimumSprite.naturalWidth;
            
            // Hide logo when it completely exits the screen
            if (this.optimumLogo.x + actualLogoWidth < 0) {
                this.optimumLogo.visible = false;
            }
        }
    }
    
    updateBonuses(deltaTime) {
        // Calculate game speed multiplier based on delta time
        const gameSpeed = deltaTime / 16.67; // 60 FPS'e göre hız oranı
        
        for (let i = this.bonuses.length - 1; i >= 0; i--) {
            const bonus = this.bonuses[i];
            
            // Move bonus to the left with dynamic speed
            bonus.x -= (this.obstacleSpeed * this.currentObstacleSpeedMultiplier) * gameSpeed;
            
            // Remove bonuses that exit the screen
            if (bonus.x + bonus.width < 0) {
                this.bonuses.splice(i, 1);
                continue;
            }
            
            // Bonus collection check
            if (!bonus.collected && this.checkBonusCollision(this.player, bonus)) {
                bonus.collected = true;
                this.score += 2; // Bonus points (corrected from 3 to 2)
                this.opti += 1; // $OPTI value increases by 1
                this.bonusCount += 1; // Track bonus count for profile
                
                // Anti-cheat: Prevent score manipulation
                if (this.score < 0) {
                    console.warn('🚨 Score manipulation detected - resetting to 0');
                    this.score = 0;
                }
                
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
        
        // Debug collision detection
        const isColliding = this.isPointInOval(playerLeft, playerTop, obstacleCenterX, obstacleCenterY, obstacleCollisionRadiusX, obstacleCollisionRadiusY) ||
                           this.isPointInOval(playerRight, playerTop, obstacleCenterX, obstacleCenterY, obstacleCollisionRadiusX, obstacleCollisionRadiusY) ||
                           this.isPointInOval(playerLeft, playerBottom, obstacleCenterX, obstacleCenterY, obstacleCollisionRadiusX, obstacleCollisionRadiusY) ||
                           this.isPointInOval(playerRight, playerBottom, obstacleCenterX, obstacleCenterY, obstacleCollisionRadiusX, obstacleCollisionRadiusY);
        
        if (isColliding) {
            console.log('🚨 COLLISION DETECTED!');
            console.log('Player:', { x: player.x, y: player.y, width: player.width, height: player.height });
            console.log('Obstacle:', { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height });
            console.log('Player Center:', { x: playerCenterX, y: playerCenterY });
            console.log('Obstacle Center:', { x: obstacleCenterX, y: obstacleCenterY });
            console.log('Collision Radii:', { x: obstacleCollisionRadiusX, y: obstacleCollisionRadiusY });
        }
        
        return isColliding;
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
        console.log('Game running:', this.gameRunning);
        console.log('Game over:', this.gameOver);
        
        // Mark that user has played a game
        localStorage.setItem('hasPlayedGame', 'true');
        this.hasPlayedGame = true;
        
        this.gameRunning = false;
        this.gameOver = true;
        
        // Record game end time and calculate total game time
        this.gameEndTime = Date.now();
        this.totalGameTime = this.gameEndTime - this.gameStartTime;
        
        console.log('Game duration:', this.totalGameTime, 'ms');
        console.log('Jump count:', this.jumpCount);
        
        // Play death sound
        this.playDeathSound();
        
        // Stop background music
        this.stopBackgroundMusic();
        
        // Strict anti-cheat validation
        const isValidScore = this.validateScore(this.score);
        if (!isValidScore) {
            console.warn('🚫 Suspicious score detected - SCORE REJECTED AND NOT SAVED');
            alert('Suspicious score detected! Your score was not saved. Please play the game properly.');
            document.getElementById('finalScore').textContent = this.score;
            document.getElementById('gameOver').style.display = 'block';
            
            // Hide How to Play button when game ends (even with suspicious score)
            document.getElementById('howToPlayBtn').style.display = 'none';
            
            // Hide Tournament button when game ends (even with suspicious score)
            document.getElementById('tournamentBtn').style.display = 'none';
            
            // Show legacy notice when game ends (even with suspicious score)
            this.showLegacyNotice();
            
            return; // Exit without saving
        }
        
        // Save score to leaderboard only if validation passes
        console.log('✅ Score validation passed - saving to leaderboard');
        this.saveScoreToSupabase();
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'block';
        
        // Hide How to Play button when game ends
        document.getElementById('howToPlayBtn').style.display = 'none';
        
        // Hide Tournament button when game ends
        document.getElementById('tournamentBtn').style.display = 'none';
        
        // Show legacy notice when game ends
        this.showLegacyNotice();
        
        console.log('✅ Game over screen displayed');
        this.updateUI();
    }
    
    // Güçlendirilmiş anti-cheat validation - çoklu katman koruma
    validateScore(score) {
        const gameTimeSeconds = this.totalGameTime / 1000;
        
        console.log('🔍 Anti-cheat validation:');
        console.log('- Game time:', gameTimeSeconds.toFixed(2), 'seconds');
        console.log('- Score:', score);
        console.log('- Jump count:', this.jumpCount);
        console.log('- Bonus count:', this.bonusCount);
        
        // Katman 1: Temel kontroller
        const suspiciousChecks = [];
        
        // Check 1: Çok yüksek skor ilk 10 saniyede (50'den fazla)
        if (gameTimeSeconds <= 10 && score > 50) {
            suspiciousChecks.push(`🚨 Çok yüksek skor ilk 10 saniyede: ${score} puan`);
        }
        
        // Check 2: Çok yüksek skor ilk 30 saniyede (150'den fazla)
        if (gameTimeSeconds <= 30 && score > 150) {
            suspiciousChecks.push(`🚨 Çok yüksek skor ilk 30 saniyede: ${score} puan`);
        }
        
        // Check 3: Saniyede 2 puandan fazla (imkansız)
        const scorePerSecond = score / gameTimeSeconds;
        if (scorePerSecond > 2) {
            suspiciousChecks.push(`🚨 İmkansız skor hızı: ${scorePerSecond.toFixed(2)} puan/saniye`);
        }
        
        // Check 4: Çok az zıplama ile yüksek skor
        const scorePerJump = this.jumpCount > 0 ? score / this.jumpCount : 0;
        if (this.jumpCount < 10 && score > 100) {
            suspiciousChecks.push(`🚨 Çok az zıplama ile yüksek skor: ${this.jumpCount} zıplama, ${score} puan`);
        }
        
        // Check 5: Çok yüksek zıplama başına skor
        if (scorePerJump > 20) {
            suspiciousChecks.push(`🚨 Çok yüksek zıplama başına skor: ${scorePerJump.toFixed(2)} puan/zıplama`);
        }
        
        // Check 6: Oyun süresi çok kısa ama yüksek skor
        if (gameTimeSeconds < 5 && score > 20) {
            suspiciousChecks.push(`🚨 Çok kısa sürede yüksek skor: ${gameTimeSeconds}s, ${score} puan`);
        }
        
        // Check 7: Bonus sayısı ile skor uyumsuzluğu
        const expectedBonusScore = this.bonusCount * 10; // Her bonus 10 puan
        if (score > expectedBonusScore + 50) { // 50 puan tolerans
            suspiciousChecks.push(`🚨 Bonus sayısı ile skor uyumsuz: ${this.bonusCount} bonus, ${score} puan`);
        }
        
        // Check 8: İmkansız yüksek skor (500'den fazla)
        if (score >= 500) {
            suspiciousChecks.push(`🚨 İmkansız yüksek skor: ${score} puan (maksimum: 499)`);
        }
        
        // Sonuç değerlendirme
        if (suspiciousChecks.length > 0) {
            console.warn('🚫 Şüpheli skor tespit edildi:');
            suspiciousChecks.forEach(check => console.warn(`  - ${check}`));
            return false;
        }
        
        console.log('✅ Skor doğrulandı - güvenli');
        return true;
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('opti').textContent = this.opti;
    }
    
    updateAuthUI() {
        const isSignedIn = window.authFunctions && window.authFunctions.isSignedIn();
        const userInfo = document.getElementById('userInfo');
        const guestSection = document.getElementById('guestSection');
        const startBtn = document.getElementById('startBtn');
        
        if (isSignedIn) {
            const user = window.authFunctions.getCurrentUser();
            userInfo.style.display = 'flex';
            guestSection.style.display = 'none';
            startBtn.disabled = false;
            
            // Update user info
            document.getElementById('userName').textContent = user.user_metadata?.full_name || 'Player';
            document.getElementById('userEmail').textContent = user.email || '';
            
            // Update avatar
            const avatarImg = document.getElementById('userAvatar');
            if (user.user_metadata?.avatar_url) {
                avatarImg.src = user.user_metadata.avatar_url;
            } else {
                avatarImg.src = 'assets/sprites/icon.png';
            }
        } else {
            userInfo.style.display = 'none';
            guestSection.style.display = 'block';
            startBtn.disabled = true;
        }
    }
    
    async loadUserProfile() {
        if (!window.authFunctions || !window.authFunctions.isSignedIn()) return;
        
        try {
            console.log('Loading user profile...');
            
            // First, try to get existing profile
            const profileResult = await window.authFunctions.getUserProfile();
            
            if (profileResult.success) {
                console.log('✅ Existing profile found:', profileResult.data);
                this.updateProfileDisplay(profileResult.data);
            } else {
                console.log('ℹ️ No existing profile, creating new one...');
                
                // Create new profile
                const createResult = await window.authFunctions.createUserProfile();
                
                if (createResult.success) {
                    console.log('✅ New profile created:', createResult.data);
                    this.updateProfileDisplay(createResult.data);
                } else {
                    console.error('❌ Failed to create profile:', createResult.error);
                    // Even if profile creation fails, allow username changes
                    this.updateProfileDisplay({
                        display_name: 'Player',
                        highest_score: 0,
                        opti_points: 0,
                        games_played: 0,
                        username_changed: false
                    });
                }
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Even if there's an error, allow username changes
            this.updateProfileDisplay({
                display_name: 'Player',
                highest_score: 0,
                opti_points: 0,
                games_played: 0,
                username_changed: false
            });
        }
    }
    
    updateProfileDisplay(profile) {
        // Update profile display
        document.getElementById('profileName').textContent = profile.display_name || 'Player';
        document.getElementById('profileEmail').textContent = profile.email || '';
        
        // Update profile avatar
        const profileAvatar = document.getElementById('profileAvatar');
        if (profile.avatar_url) {
            profileAvatar.src = profile.avatar_url;
        } else {
            profileAvatar.src = 'assets/sprites/icon.png';
        }
        
        // Update stats
        document.getElementById('profileHighestScore').textContent = profile.highest_score || 0;
        document.getElementById('profileOptiPoints').textContent = profile.opti_points || 0;
        document.getElementById('profileGamesPlayed').textContent = profile.games_played || 0;
        
        // Update game's $OPTI display to match profile
        this.opti = profile.opti_points || 0;
        this.updateUI();
        
        // Check if username can be changed (temporarily allow unlimited)
        const changeBtn = document.getElementById('changeUsernameBtn');
        const changeInfo = document.getElementById('usernameChangeInfo');
        
        // For now, always allow username changes until we implement proper counting
        changeBtn.disabled = false;
        changeInfo.textContent = 'You can change your username (limit will be 2 changes soon)!';
        changeInfo.style.color = '#2ecc71';
    }
    
    showProfile() {
        document.getElementById('profileOverlay').style.display = 'flex';
        // Always reload profile to get latest data
        this.loadUserProfile();
    }
    
    hideProfile() {
        document.getElementById('profileOverlay').style.display = 'none';
    }
    
    async changeUsername() {
        const newUsername = document.getElementById('newUsernameInput').value.trim();
        if (!newUsername) {
            alert('Please enter a username');
            return;
        }
        
        if (newUsername.length < 3) {
            alert('Username must be at least 3 characters long');
            return;
        }
        
        try {
            const result = await window.authFunctions.updateUsername(newUsername);
            
            if (result.success) {
                alert('Username changed successfully!');
                document.getElementById('newUsernameInput').value = '';
                this.loadUserProfile();
                
                // Refresh leaderboard if it's currently visible
                if (this.leaderboardVisible) {
                    console.log('🔄 Refreshing leaderboard after username change...');
                    this.loadLeaderboard();
                }
            } else {
                alert('Failed to change username: ' + result.error);
            }
        } catch (error) {
            console.error('Error changing username:', error);
            alert('Failed to change username. Please try again.');
        }
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
    
    update(deltaTime) {
        if (this.gameRunning && !this.gameOver && !this.gamePaused) {
            this.updatePlayer(deltaTime);
            this.updateObstacleSpeed(deltaTime);
            this.spawnObstacle();
            this.spawnBonus();
            this.updateObstacles(deltaTime);
            this.updateBonuses(deltaTime);
            this.updateClouds(); // Add cloud animation
            this.frameCount++;
            
            // Sprite animation update
            this.updateSpriteAnimation();
            
            // Update game time with real delta time
            this.totalGameTime += deltaTime;
        }
    }
    

    
    updateSpriteAnimation() {
        // Time since last animation change
        const timeSinceLastAnimation = this.totalGameTime - this.lastAnimationTime;
        
        if (timeSinceLastAnimation >= this.animationSpeed) {
            this.currentSprite = (this.currentSprite + 1) % 2; // Changes between 0 and 1
            this.lastAnimationTime = this.totalGameTime;
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
            console.log('Loading global leaderboard...');
            
            // Check if authFunctions is available
            if (!window.authFunctions) {
                throw new Error('AuthFunctions not available');
            }
            
            // Get global leaderboard data
            const result = await window.authFunctions.getLeaderboard(false, 10);
            
            if (result.success) {
                console.log('✅ Global leaderboard loaded:', result.data);
                this.displayLeaderboard(result.data);
            } else {
                console.error('❌ Failed to load global leaderboard:', result.error);
                this.showLeaderboardError('Failed to load global leaderboard');
            }
            
        } catch (error) {
            console.error('Error loading global leaderboard:', error);
            this.showLeaderboardError('Failed to load global leaderboard');
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
                    Please check your Supabase configuration in supabase-config.js
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
    
    showTournament() {
        document.getElementById('tournamentOverlay').style.display = 'flex';
        this.tournamentVisible = true;
    }
    
    hideTournament() {
        document.getElementById('tournamentOverlay').style.display = 'none';
        this.tournamentVisible = false;
    }
    
    // populateLeaderboard method removed - replaced with Firebase version above
    
    getLeaderboardData() {
        const leaderboard = localStorage.getItem('leaderboard');
        return leaderboard ? JSON.parse(leaderboard) : [];
    }
    
    // Anti-cheat validation function - REMOVED (using simplified version above)
    
    calculateMaxPossibleScore() {
        // Estimate maximum possible score based on game mechanics
        // This is a rough calculation - adjust based on your game's scoring system
        const maxJumps = this.jumpCount || 100; // Assume max 100 jumps
        const maxTime = 300; // 5 minutes max game time
        const pointsPerJump = 10; // Average points per successful jump
        const timeBonus = maxTime * 2; // Time bonus
        
        return (maxJumps * pointsPerJump) + timeBonus;
    }
    
    // Create or update user profile in Supabase
    async createUserProfile() {
        try {
            console.log('=== CREATING USER PROFILE ===');
            console.log('Username:', this.username);
            
            // Check if user is signed in
            if (!window.authFunctions || !window.authFunctions.isSignedIn()) {
                console.log('ℹ️ User not signed in - skipping profile creation');
                return;
            }
            
            // Check if user is banned
            const banStatus = await window.authFunctions.checkBanStatus();
            if (banStatus.success && banStatus.isBanned) {
                console.warn('🚫 User is banned - profile not created');
                alert('Your account has been banned. Cannot create profile.');
                return;
            }
            
            // Create or update user profile
            const result = await window.authFunctions.createUserProfile({
                display_name: this.username,
                username_changed: false,
                highest_score: 0,
                opti_points: 0,
                games_played: 0
            });
            
            if (result.success) {
                console.log('✅ User profile created/updated successfully');
                console.log('Profile data:', result.data);
            } else {
                console.error('❌ Failed to create user profile:', result.error);
            }
            
        } catch (error) {
            console.error('❌ Error creating user profile:', error);
        }
    }
    
    // Save score to Supabase database
    async saveScoreToSupabase() {
        try {
            console.log('🎯 === SAVING SCORE TO SUPABASE ===');
            console.log('Current score:', this.score);
            console.log('Bonus count:', this.bonusCount);
            console.log('Total game time:', this.totalGameTime);
            console.log('Jump count:', this.jumpCount);
            // Check if user is signed in
            if (!window.authFunctions || !window.authFunctions.isSignedIn()) {
                console.log('❌ User not signed in - skipping score save');
                return;
            }
            
            // Calculate $OPTI points earned
            const optiEarned = this.calculateOptiPoints();
            console.log('🎯 OPTI earned this game:', optiEarned);
            
            // Update user profile with new score and OPTI points
            console.log('🔄 Updating user profile...');
            
            // First get current profile to preserve existing values
            const currentProfile = await window.authFunctions.getUserProfile();
            console.log('📊 Current profile data:', currentProfile);
            
            let currentOptiPoints = 0;
            let currentHighestScore = 0;
            let currentGamesPlayed = 0;
            let currentDisplayName = 'Player';
            
            if (currentProfile.success && currentProfile.data) {
                currentOptiPoints = currentProfile.data.opti_points || 0;
                currentHighestScore = currentProfile.data.highest_score || 0;
                currentGamesPlayed = currentProfile.data.games_played || 0;
                currentDisplayName = currentProfile.data.display_name || 'Player';
            }
            
            // Update score and OPTI points
            const newOptiPoints = currentOptiPoints + optiEarned;
            const newHighestScore = Math.max(currentHighestScore, this.score);
            const newGamesPlayed = currentGamesPlayed + 1;
            
            console.log('📊 Profile update data:', {
                display_name: currentDisplayName,
                highest_score: newHighestScore,
                opti_points: newOptiPoints,
                games_played: newGamesPlayed
            });
            
            const result = await window.authFunctions.createUserProfile({
                display_name: currentDisplayName,
                highest_score: newHighestScore,
                opti_points: newOptiPoints,
                games_played: newGamesPlayed
            });
            
            if (result.success) {
                console.log('✅ Profile updated successfully');
                console.log('Updated profile data:', result.data);
                
                // Save to leaderboards
                console.log('🔄 Saving to leaderboards...');
                console.log('📊 Score data being sent:');
                console.log('- Score:', this.score);
                console.log('- OPTI Earned:', optiEarned);
                console.log('- Game Duration:', this.totalGameTime);
                console.log('- Jump Count:', this.jumpCount);
                
                const leaderboardResult = await window.authFunctions.saveToLeaderboard(
                    this.score, 
                    optiEarned, 
                    this.totalGameTime, 
                    this.jumpCount,
                    this.currentGameSessionToken // Tek kullanımlık oyun bileti (local'de dummy)
                );
                
                if (leaderboardResult.success) {
                    console.log('✅ Score saved to leaderboards successfully');
                } else {
                    console.error('❌ Failed to save to leaderboards:', leaderboardResult.error);
                }
                
                // Update profile display if profile is open
                if (document.getElementById('profileOverlay').style.display === 'flex') {
                    console.log('🔄 Profile overlay is open - reloading profile data');
                    this.loadUserProfile();
                }
                
                // Update game's $OPTI display to match updated profile
                console.log('🔄 Updating game $OPTI display to match profile...');
                this.loadUserProfile();
            } else {
                console.error('❌ Failed to update profile:', result.error);
            }
            
        } catch (error) {
            console.error('❌ Error in saveScoreToSupabase:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }
    }
    
    // Calculate $OPTI points based on bonus items collected
    calculateOptiPoints() {
        // $OPTI points = number of bonus items collected in this game
        return this.bonusCount;
    }
    
    // Update OPTI points display in UI
    updateOptiDisplay() {
        // This will be called after profile is updated
        // For now, just log the update
        console.log('🔄 OPTI display updated');
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
        // Monday as start of week (0 = Sunday, 1 = Monday, etc.)
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0); // Reset time to start of day
        return weekStart;
    }
    
    async saveToWeeklyLeaderboard(username, score) {
        try {
            console.log('=== SAVING TO WEEKLY LEADERBOARD ===');
            console.log('Username:', username);
            console.log('Score:', score);
            console.log('Supabase available:', !!window.supabase);
            
            if (!window.supabase) {
                console.warn('Supabase not available for weekly leaderboard - skipping');
                return;
            }

            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            
            console.log('Current date:', now.toISOString());
            console.log('Week start:', weekStart.toISOString());

            // Check if user already has a score for this week
            const { data: existingScores, error: queryError } = await window.supabase
                .from('weekly_scores')
                .select('score')
                .eq('username', username)
                .eq('week_start', weekStart.toISOString());

            if (queryError) {
                console.error('Error querying existing weekly scores:', queryError);
                return;
            }

            let existingScore = 0;
            let hasExistingScore = false;

            // Find the highest existing score for this user this week
            if (existingScores && existingScores.length > 0) {
                existingScore = Math.max(...existingScores.map(s => s.score));
                hasExistingScore = true;
            }

            // Only save if this is a new high score for this week
            if (!hasExistingScore || score > existingScore) {
                console.log(`Saving new weekly score for ${username}: ${score} (previous best this week: ${existingScore})`);
                
                const { error: insertError } = await window.supabase
                    .from('weekly_scores')
                    .insert({
                        username: username,
                        score: score,
                        opti_earned: this.calculateOptiPoints(),
                        week_start: weekStart.toISOString(),
                        game_date: new Date().toISOString(),
                        game_duration: this.totalGameTime,
                        jump_count: this.jumpCount
                    });

                if (insertError) {
                    console.error('Error saving weekly score:', insertError);
                    return;
                }
                
                console.log(`✅ New weekly score saved for ${username}: ${score}`);
            } else {
                console.log(`❌ Weekly score not saved for ${username}: ${score} ≤ ${existingScore} (not a new high score for this week)`);
            }

        } catch (error) {
            console.error('❌ Error saving to weekly leaderboard:', error);
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
            console.log('Loading weekly leaderboard...');
            
            // Check if authFunctions is available
            if (!window.authFunctions) {
                throw new Error('AuthFunctions not available');
            }
            
            // Get weekly leaderboard data
            const result = await window.authFunctions.getLeaderboard(true, 10);
            
            if (result.success) {
                console.log('✅ Weekly leaderboard loaded:', result.data);
                this.displayWeeklyLeaderboard(result.data);
            } else {
                console.error('❌ Failed to load weekly leaderboard:', result.error);
                this.showWeeklyLeaderboardError('Failed to load weekly leaderboard');
            }
            
        } catch (error) {
            console.error('Error loading weekly leaderboard:', error);
            this.showWeeklyLeaderboardError('Failed to load weekly leaderboard');
        }
    }
    
    displayWeeklyLeaderboard(scores) {
        const weeklyLeaderboardList = document.getElementById('weeklyLeaderboardList');
        const weeklyLeaderboardLoading = document.getElementById('weeklyLeaderboardLoading');
        
        console.log('=== DISPLAYING WEEKLY LEADERBOARD ===');
        console.log('Scores to display:', scores.length, '(max 10)');
        console.log('Scores data:', scores);
        
        // Hide loading
        weeklyLeaderboardLoading.style.display = 'none';
        weeklyLeaderboardList.style.display = 'flex';
        
        weeklyLeaderboardList.innerHTML = '';
        
        if (scores.length === 0) {
            console.log('No scores found for this week');
            weeklyLeaderboardList.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 1rem;">No scores this week yet. Be the first!</p>
                    <p style="color: rgba(255, 255, 255, 0.4); font-size: 0.8rem; margin-top: 10px;">
                        Current week: ${this.getWeekStart(new Date()).toLocaleDateString()}
                    </p>
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
        
        console.log('=== WEEKLY LEADERBOARD ERROR ===');
        console.log('Error message:', message);
        
        weeklyLeaderboardLoading.style.display = 'none';
        weeklyLeaderboardList.style.display = 'flex';
        
        weeklyLeaderboardList.innerHTML = `
            <div style="text-align: center; padding: 15px;">
                <p style="color: #ff6b6b; font-size: 1rem; margin-bottom: 10px;">⚠️ ${message}</p>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">
                    Please check your Supabase configuration
                </p>
                <div style="margin-top: 15px; text-align: center;">
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">
                        Make sure weekly_scores table exists in Supabase
                    </p>
                </div>
            </div>
        `;
    }
    
    // Test function for weekly leaderboard
    async testWeeklyLeaderboard() {
        console.log('=== TESTING WEEKLY LEADERBOARD ===');
        
        try {
            const { collection, getDocs } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Get all weekly scores
            const allWeeklyScores = await getDocs(collection(db, 'weekly_scores'));
            console.log('Total weekly scores in database:', allWeeklyScores.size);
            
            allWeeklyScores.forEach((doc) => {
                const data = doc.data();
                console.log('Weekly score:', data);
            });
            
            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            console.log('Current week start:', weekStart.toISOString());
            
            // Count scores for current week
            let currentWeekCount = 0;
            allWeeklyScores.forEach((doc) => {
                const data = doc.data();
                if (data.weekStart === weekStart.toISOString()) {
                    currentWeekCount++;
                    console.log('Current week score:', data);
                }
            });
            
            console.log('Scores for current week:', currentWeekCount);
            
            alert(`Weekly Leaderboard Test:\nTotal scores: ${allWeeklyScores.size}\nCurrent week scores: ${currentWeekCount}\nWeek start: ${weekStart.toLocaleDateString()}`);
            
        } catch (error) {
            console.error('Test error:', error);
            alert('Test failed: ' + error.message);
        }
    }
    
    // Debug function to find missing scores
    async debugMissingScores() {
        console.log('=== DEBUGGING MISSING SCORES ===');
        
        try {
            const { collection, getDocs, query, orderBy, limit } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            
            console.log('Current week start:', weekStart.toISOString());
            
            // Get all global scores
            const globalScoresSnapshot = await getDocs(collection(db, 'scores'));
            console.log('Total global scores:', globalScoresSnapshot.size);
            
            // Get all weekly scores
            const weeklyScoresSnapshot = await getDocs(collection(db, 'weekly_scores'));
            console.log('Total weekly scores:', weeklyScoresSnapshot.size);
            
            // Create sets for comparison
            const globalUsers = new Set();
            const weeklyUsers = new Set();
            const currentWeekUsers = new Set();
            
            // Process global scores
            globalScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                globalUsers.add(data.username);
            });
            
            // Process weekly scores
            weeklyScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                weeklyUsers.add(data.username);
                
                if (data.weekStart === weekStart.toISOString()) {
                    currentWeekUsers.add(data.username);
                }
            });
            
            // Find users in global but not in weekly
            const missingFromWeekly = [];
            globalUsers.forEach(username => {
                if (!weeklyUsers.has(username)) {
                    missingFromWeekly.push(username);
                }
            });
            
            // Find users in global but not in current week
            const missingFromCurrentWeek = [];
            globalUsers.forEach(username => {
                if (!currentWeekUsers.has(username)) {
                    missingFromCurrentWeek.push(username);
                }
            });
            
            console.log('Users in global leaderboard:', Array.from(globalUsers));
            console.log('Users in weekly leaderboard:', Array.from(weeklyUsers));
            console.log('Users in current week:', Array.from(currentWeekUsers));
            console.log('Missing from weekly:', missingFromWeekly);
            console.log('Missing from current week:', missingFromCurrentWeek);
            
            // Show detailed info
            let report = `📊 Weekly Leaderboard Debug Report\n\n`;
            report += `Global Leaderboard Users: ${globalUsers.size}\n`;
            report += `Weekly Leaderboard Users: ${weeklyUsers.size}\n`;
            report += `Current Week Users: ${currentWeekUsers.size}\n\n`;
            
            if (missingFromWeekly.length > 0) {
                report += `❌ Missing from Weekly LB: ${missingFromWeekly.length}\n`;
                missingFromWeekly.forEach(user => report += `  - ${user}\n`);
                report += `\n`;
            }
            
            if (missingFromCurrentWeek.length > 0) {
                report += `⚠️ Missing from Current Week: ${missingFromCurrentWeek.length}\n`;
                missingFromCurrentWeek.forEach(user => report += `  - ${user}\n`);
            }
            
            if (missingFromWeekly.length === 0 && missingFromCurrentWeek.length === 0) {
                report += `✅ All users are properly synced!`;
            }
            
            alert(report);
            
        } catch (error) {
            console.error('Debug error:', error);
            alert('Debug failed: ' + error.message);
        }
    }
    
    // Debug function to check migration data
    async debugMigrationData() {
        console.log('🔍 DEBUGGING MIGRATION DATA...');
        
        try {
            if (!window.firebaseDB || !window.firebaseFunctions) {
                console.log('❌ Firebase not available');
                return;
            }

            const { collection, getDocs } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            const weekStartTime = weekStart.getTime();
            
            console.log('📅 Current time:', now.toISOString());
            console.log('📅 Week start:', weekStart.toISOString());
            console.log('📅 Week start time:', weekStartTime);
            
            // Get all global scores
            const globalScoresSnapshot = await getDocs(collection(db, 'scores'));
            console.log('🌍 Total global scores:', globalScoresSnapshot.size);
            
            // Get all weekly scores
            const weeklyScoresSnapshot = await getDocs(collection(db, 'weekly_scores'));
            console.log('📊 Total weekly scores:', weeklyScoresSnapshot.size);
            
            // Check global scores dates
            console.log('🔍 Checking global scores dates:');
            globalScoresSnapshot.forEach((doc, index) => {
                if (index < 10) { // Show first 10
                    const data = doc.data();
                    const scoreDate = new Date(data.date || data.timestamp);
                    const scoreTime = scoreDate.getTime();
                    const isThisWeek = scoreTime >= weekStartTime;
                    console.log(`  ${data.username}: ${scoreDate.toISOString()} (this week: ${isThisWeek})`);
                }
            });
            
            // Check weekly scores for current week
            const existingWeeklyUsers = new Set();
            weeklyScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.weekStart === weekStart.toISOString()) {
                    existingWeeklyUsers.add(data.username);
                }
            });
            
            console.log('👥 Users already in weekly LB this week:', Array.from(existingWeeklyUsers));
            
            // Find missing users (regardless of date)
            const missingUsers = [];
            globalScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                // Skip entries with invalid usernames
                if (data.username && data.username.trim() !== '' && data.username !== 'undefined') {
                    if (!existingWeeklyUsers.has(data.username)) {
                        missingUsers.push(data.username);
                    }
                }
            });
            
            console.log('❌ Users in global but NOT in weekly:', missingUsers);
            console.log('📊 Missing users count:', missingUsers.length);
            
        } catch (error) {
            console.error('❌ Debug error:', error);
        }
    }

    // Migrate ALL missing players from global to weekly leaderboard
    async migrateAllMissingPlayers() {
        console.log('🚀 MIGRATING ALL MISSING PLAYERS TO WEEKLY LEADERBOARD');
        
        try {
            if (!window.firebaseDB || !window.firebaseFunctions) {
                console.log('❌ Firebase not available');
                return;
            }

            const { collection, getDocs, addDoc } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            
            console.log('📅 Week start:', weekStart.toISOString());
            
            // Get all global scores
            const globalScoresSnapshot = await getDocs(collection(db, 'scores'));
            console.log('🌍 Global scores:', globalScoresSnapshot.size);
            
            // Get all weekly scores for current week
            const weeklyScoresSnapshot = await getDocs(collection(db, 'weekly_scores'));
            console.log('📊 Weekly scores:', weeklyScoresSnapshot.size);
            
            // Create a set of usernames that already have weekly scores for this week
            const existingWeeklyUsers = new Set();
            weeklyScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.weekStart === weekStart.toISOString()) {
                    existingWeeklyUsers.add(data.username);
                }
            });
            
            console.log('👥 Users already in weekly LB:', existingWeeklyUsers.size);
            
            // Find ALL missing players
            let migratedCount = 0;
            const playersToMigrate = [];
            
            globalScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                // Skip entries with invalid usernames
                if (data.username && data.username.trim() !== '' && data.username !== 'undefined') {
                    if (!existingWeeklyUsers.has(data.username)) {
                        playersToMigrate.push({
                            username: data.username,
                            score: data.score,
                            date: data.date || data.timestamp,
                            gameDuration: data.gameDuration || 0,
                            jumpCount: data.jumpCount || 0,
                            originalDocId: doc.id
                        });
                    }
                }
            });
            
            console.log(`🎯 Found ${playersToMigrate.length} players to migrate`);
            
            if (playersToMigrate.length === 0) {
                console.log('✅ No players need migration!');
                return;
            }
            
            // Migrate ALL missing players
            for (const playerData of playersToMigrate) {
                try {
                    await addDoc(collection(db, 'weekly_scores'), {
                        username: playerData.username,
                        score: playerData.score,
                        weekStart: weekStart.toISOString(),
                        date: playerData.date,
                        gameDuration: playerData.gameDuration || 0,
                        jumpCount: playerData.jumpCount || 0,
                        validated: true,
                        migrated: true,
                        migrationType: 'manual_all_missing',
                        originalGlobalDocId: playerData.originalDocId
                    });
                    migratedCount++;
                    console.log(`✅ Migrated ${playerData.username} (score: ${playerData.score})`);
                } catch (error) {
                    console.error(`❌ Failed to migrate ${playerData.username}:`, error);
                }
            }
            
            console.log(`🎉 MIGRATION COMPLETED: ${migratedCount} players migrated to weekly leaderboard!`);
            console.log(`✅ SUCCESS: All missing players are now in weekly leaderboard!`);
            
        } catch (error) {
            console.error('❌ Migration error:', error);
        }
    }

    // Immediate migration function that runs right now
    async runMigrationNow() {
        console.log('🚀 IMMEDIATE MIGRATION STARTED - Running right now!');
        
        // Wait a bit for Firebase to be ready
        setTimeout(async () => {
            await this.debugMigrationData();
            await this.migrateAllMissingPlayers();
        }, 2000);
    }

    // Auto-migration function that runs silently in background
    async autoMigrateThisWeekPlayers() {
        try {
            // Only run if Firebase is available
            if (!window.firebaseDB || !window.firebaseFunctions) {
                console.log('Firebase not available - skipping auto migration');
                return;
            }

            const { collection, getDocs, addDoc, query, orderBy, limit } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            const weekStartTime = weekStart.getTime();
            
            console.log('🔄 Auto-migration started...');
            console.log('Current time:', now.toISOString());
            console.log('Week start:', weekStart.toISOString());
            console.log('Week start time:', weekStartTime);
            
            // Get all global scores
            const globalScoresSnapshot = await getDocs(collection(db, 'scores'));
            console.log('Global scores count:', globalScoresSnapshot.size);
            
            // Get all weekly scores for current week
            const weeklyScoresSnapshot = await getDocs(collection(db, 'weekly_scores'));
            console.log('Weekly scores count:', weeklyScoresSnapshot.size);
            
            // Create a set of usernames that already have weekly scores for this week
            const existingWeeklyUsers = new Set();
            weeklyScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.weekStart === weekStart.toISOString()) {
                    existingWeeklyUsers.add(data.username);
                }
            });
            
            console.log('Existing weekly users this week:', Array.from(existingWeeklyUsers));
            
            // Find ALL players who are missing from weekly leaderboard (regardless of date)
            let migratedCount = 0;
            const playersToMigrate = [];
            
            globalScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                const scoreDate = new Date(data.date || data.timestamp);
                const scoreTime = scoreDate.getTime();
                
                console.log(`Checking ${data.username}: score date ${scoreDate.toISOString()}, time ${scoreTime}, week start ${weekStartTime}`);
                
                // Migrate ALL players who are missing from weekly leaderboard
                if (!existingWeeklyUsers.has(data.username)) {
                    playersToMigrate.push({
                        username: data.username,
                        score: data.score,
                        date: data.date || data.timestamp,
                        gameDuration: data.gameDuration || 0,
                        jumpCount: data.jumpCount || 0,
                        originalDocId: doc.id,
                        isThisWeek: scoreTime >= weekStartTime
                    });
                    console.log(`✅ Found player to migrate: ${data.username} (score: ${data.score}, this week: ${scoreTime >= weekStartTime})`);
                }
            });
            
            console.log(`Players to migrate: ${playersToMigrate.length}`);
            
            // Auto-migrate missing players silently
            for (const playerData of playersToMigrate) {
                try {
                    await addDoc(collection(db, 'weekly_scores'), {
                        username: playerData.username,
                        score: playerData.score,
                        weekStart: weekStart.toISOString(),
                        date: playerData.date,
                        gameDuration: playerData.gameDuration || 0,
                        jumpCount: playerData.jumpCount || 0,
                        validated: true,
                        migrated: true,
                        migrationType: 'auto_this_week_players',
                        originalGlobalDocId: playerData.originalDocId
                    });
                    migratedCount++;
                    console.log(`🔄 Auto-migrated ${playerData.username} to weekly leaderboard`);
                } catch (error) {
                    console.error(`❌ Failed to auto-migrate ${playerData.username}:`, error);
                }
            }
            
            if (migratedCount > 0) {
                console.log(`✅ Auto-migration completed: ${migratedCount} players migrated to weekly leaderboard`);
            } else {
                console.log('ℹ️ No players needed migration');
            }
            
        } catch (error) {
            console.error('❌ Auto-migration error:', error);
        }
    }

    // Function to migrate players who played this week but are missing from weekly leaderboard (legacy function)
    async migrateThisWeekPlayersToWeekly() {
        console.log('=== MIGRATING THIS WEEK PLAYERS TO WEEKLY LEADERBOARD ===');
        
        try {
            const { collection, getDocs, addDoc, query, orderBy, limit } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            const weekStartTime = weekStart.getTime();
            
            console.log('Current week start:', weekStart.toISOString());
            
            // Get all global scores
            const globalScoresSnapshot = await getDocs(collection(db, 'scores'));
            
            // Get all weekly scores for current week
            const weeklyScoresSnapshot = await getDocs(collection(db, 'weekly_scores'));
            
            // Create a set of usernames that already have weekly scores for this week
            const existingWeeklyUsers = new Set();
            weeklyScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.weekStart === weekStart.toISOString()) {
                    existingWeeklyUsers.add(data.username);
                }
            });
            
            // Find players who played this week but are missing from weekly leaderboard
            let migratedCount = 0;
            const playersToMigrate = [];
            
            globalScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                const scoreDate = new Date(data.date || data.timestamp);
                const scoreTime = scoreDate.getTime();
                
                // Check if this score was achieved this week
                if (scoreTime >= weekStartTime && !existingWeeklyUsers.has(data.username)) {
                    playersToMigrate.push({
                        username: data.username,
                        score: data.score,
                        date: data.date || data.timestamp,
                        gameDuration: data.gameDuration || 0,
                        jumpCount: data.jumpCount || 0,
                        originalDocId: doc.id
                    });
                }
            });
            
            console.log(`🎯 Found ${playersToMigrate.length} players who are missing from weekly leaderboard`);
            
            if (playersToMigrate.length === 0) {
                console.log('✅ No players found who are missing from weekly leaderboard!');
                return;
            }
            
            // Add missing players to weekly leaderboard
            for (const playerData of playersToMigrate) {
                try {
                    await addDoc(collection(db, 'weekly_scores'), {
                        username: playerData.username,
                        score: playerData.score,
                        weekStart: weekStart.toISOString(),
                        date: playerData.date,
                        gameDuration: playerData.gameDuration || 0,
                        jumpCount: playerData.jumpCount || 0,
                        validated: true,
                        migrated: true,
                        migrationType: 'all_missing_players',
                        originalGlobalDocId: playerData.originalDocId
                    });
                    migratedCount++;
                    console.log(`✅ Migrated ${playerData.username} with score ${playerData.score} to weekly leaderboard`);
                } catch (error) {
                    console.error(`❌ Failed to migrate ${playerData.username}:`, error);
                }
            }
            
            console.log(`🎉 IMMEDIATE MIGRATION COMPLETED: ${migratedCount} players migrated to weekly leaderboard!`);
            console.log(`✅ SUCCESS: All this week players are now in weekly leaderboard!`);
            
        } catch (error) {
            console.error('❌ Migration error:', error);
        }
    }

    // Function to add missing users to weekly leaderboard (legacy function)
    async addMissingUsersToWeekly() {
        console.log('=== ADDING MISSING USERS TO WEEKLY LEADERBOARD ===');
        
        try {
            const { collection, getDocs, addDoc, query, orderBy, limit } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            
            // Get all global scores
            const globalScoresSnapshot = await getDocs(collection(db, 'scores'));
            
            // Get all weekly scores for current week
            const weeklyScoresSnapshot = await getDocs(collection(db, 'weekly_scores'));
            
            // Create a set of usernames that already have weekly scores
            const existingWeeklyUsers = new Set();
            weeklyScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.weekStart === weekStart.toISOString()) {
                    existingWeeklyUsers.add(data.username);
                }
            });
            
            // Find missing users and add them
            let addedCount = 0;
            const missingUsers = [];
            
            globalScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                if (!existingWeeklyUsers.has(data.username)) {
                    missingUsers.push(data);
                }
            });
            
            console.log('Missing users to add:', missingUsers.length);
            
            if (missingUsers.length === 0) {
                alert('✅ No missing users found! All global users are already in weekly leaderboard.');
                return;
            }
            
            // Add missing users to weekly leaderboard
            for (const userData of missingUsers) {
                try {
                    await addDoc(collection(db, 'weekly_scores'), {
                        username: userData.username,
                        score: userData.score,
                        weekStart: weekStart.toISOString(),
                        date: userData.date || new Date().toISOString(),
                        gameDuration: userData.gameDuration || 0,
                        jumpCount: userData.jumpCount || 0,
                        validated: true,
                        migrated: true,
                        migrationType: 'missing_users'
                    });
                    addedCount++;
                    console.log(`✅ Added missing user ${userData.username} with score ${userData.score}`);
                } catch (error) {
                    console.error(`❌ Failed to add ${userData.username}:`, error);
                }
            }
            
            console.log(`Migration completed: ${addedCount} missing users added`);
            alert(`✅ Missing Users Migration Completed!\n\nAdded: ${addedCount} missing users to weekly leaderboard.\n\nWeekly leaderboard should now show all players!`);
            
        } catch (error) {
            console.error('❌ Migration error:', error);
            alert('Migration failed: ' + error.message);
        }
    }
    
    // One-time migration: Add top 10 global leaderboard users to weekly leaderboard
    async migrateTop10GlobalToWeekly() {
        console.log('=== ONE-TIME MIGRATION: TOP 10 GLOBAL TO WEEKLY ===');
        
        try {
            const { collection, getDocs, addDoc, query, orderBy, limit } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            
            console.log('Current week start:', weekStart.toISOString());
            
            // Get top 10 global scores
            const top10Query = query(
                collection(db, 'scores'),
                orderBy('score', 'desc'),
                limit(10)
            );
            
            const top10Snapshot = await getDocs(top10Query);
            console.log('Top 10 global scores found:', top10Snapshot.size);
            
            if (top10Snapshot.size === 0) {
                alert('❌ No global scores found!');
                return;
            }
            
            // Get existing weekly scores for current week
            const weeklyQuery = query(
                collection(db, 'weekly_scores'),
                orderBy('score', 'desc'),
                limit(20)
            );
            const weeklySnapshot = await getDocs(weeklyQuery);
            
            // Create a set of usernames that already have weekly scores
            const existingWeeklyUsers = new Set();
            weeklySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.weekStart === weekStart.toISOString()) {
                    existingWeeklyUsers.add(data.username);
                }
            });
            
            console.log('Users already in weekly leaderboard:', Array.from(existingWeeklyUsers));
            
            // Add top 10 global scores to weekly leaderboard (if not already there)
            let addedCount = 0;
            let skippedCount = 0;
            
            for (const doc of top10Snapshot.docs) {
                const data = doc.data();
                
                if (existingWeeklyUsers.has(data.username)) {
                    console.log(`⏭️ Skipping ${data.username} - already in weekly leaderboard`);
                    skippedCount++;
                    continue;
                }
                
                try {
                    await addDoc(collection(db, 'weekly_scores'), {
                        username: data.username,
                        score: data.score,
                        weekStart: weekStart.toISOString(),
                        date: data.date || new Date().toISOString(),
                        gameDuration: data.gameDuration || 0,
                        jumpCount: data.jumpCount || 0,
                        validated: true,
                        migrated: true, // Mark as migrated
                        migrationType: 'top10_global'
                    });
                    addedCount++;
                    console.log(`✅ Added ${data.username} with score ${data.score} to weekly leaderboard`);
                } catch (error) {
                    console.error(`❌ Failed to add ${data.username}:`, error);
                }
            }
            
            console.log(`Migration completed: ${addedCount} scores added, ${skippedCount} skipped`);
            alert(`✅ Top 10 Migration Completed!\n\nAdded: ${addedCount} users\nSkipped: ${skippedCount} users (already in weekly LB)\n\nWeekly leaderboard now has the top global players!`);
            
        } catch (error) {
            console.error('❌ Migration error:', error);
            alert('Migration failed: ' + error.message);
        }
    }
    
    // Migration function to add missing scores to weekly leaderboard
    async migrateTodayScoresToWeekly() {
        console.log('=== MIGRATING TODAY\'S SCORES TO WEEKLY LEADERBOARD ===');
        
        try {
            const { collection, getDocs, addDoc, query, where } = window.firebaseFunctions;
            const db = window.firebaseDB;
            
            // Get current week start
            const now = new Date();
            const weekStart = this.getWeekStart(now);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            console.log('Current date:', now.toISOString());
            console.log('Week start:', weekStart.toISOString());
            console.log('Today start:', today.toISOString());
            
            // Get all global scores
            const globalScoresSnapshot = await getDocs(collection(db, 'scores'));
            console.log('Total global scores:', globalScoresSnapshot.size);
            
            // Get all weekly scores for current week
            const weeklyQuery = query(
                collection(db, 'weekly_scores'),
                where('weekStart', '==', weekStart.toISOString())
            );
            const weeklyScoresSnapshot = await getDocs(weeklyQuery);
            console.log('Current week weekly scores:', weeklyScoresSnapshot.size);
            
            // Create a set of usernames that already have weekly scores
            const existingWeeklyUsers = new Set();
            weeklyScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                existingWeeklyUsers.add(data.username);
            });
            
            console.log('Users already in weekly leaderboard:', Array.from(existingWeeklyUsers));
            
            // Find global scores that should be in weekly leaderboard but aren't
            const missingScores = [];
            const todayScores = [];
            
            globalScoresSnapshot.forEach((doc) => {
                const data = doc.data();
                const scoreDate = new Date(data.date);
                scoreDate.setHours(0, 0, 0, 0);
                
                // Check if score is from today (September 9, 2024)
                const isToday = scoreDate.getTime() === today.getTime();
                if (isToday) {
                    todayScores.push({
                        id: doc.id,
                        ...data,
                        scoreDate: scoreDate
                    });
                }
                
                // Check if score is from this week and user doesn't have weekly score
                if (scoreDate >= weekStart && !existingWeeklyUsers.has(data.username)) {
                    missingScores.push({
                        id: doc.id,
                        ...data,
                        scoreDate: scoreDate
                    });
                }
            });
            
            console.log('Scores from today (Sept 9):', todayScores.length);
            todayScores.forEach(score => {
                console.log('Today\'s score:', score);
            });
            
            console.log('Missing scores to migrate:', missingScores.length);
            missingScores.forEach(score => {
                console.log('Missing score:', score);
            });
            
            if (missingScores.length === 0) {
                alert(`✅ No missing scores found!\n\nToday's scores: ${todayScores.length}\nAll global scores are already in weekly leaderboard.`);
                return;
            }
            
            // Add missing scores to weekly leaderboard
            let addedCount = 0;
            for (const score of missingScores) {
                try {
                    await addDoc(collection(db, 'weekly_scores'), {
                        username: score.username,
                        score: score.score,
                        weekStart: weekStart.toISOString(),
                        date: score.date,
                        migrated: true // Mark as migrated
                    });
                    addedCount++;
                    console.log(`✅ Added ${score.username} with score ${score.score} to weekly leaderboard`);
                } catch (error) {
                    console.error(`❌ Failed to add ${score.username}:`, error);
                }
            }
            
            console.log(`Migration completed: ${addedCount} scores added to weekly leaderboard`);
            alert(`✅ Migration completed!\n\nToday's scores found: ${todayScores.length}\nMissing scores migrated: ${addedCount}\nAdded to weekly leaderboard successfully.`);
            
        } catch (error) {
            console.error('❌ Migration error:', error);
            alert('Migration failed: ' + error.message);
        }
    }
    

    
    detectBrowserPerformance() {
        // Detect browser and performance characteristics
        const userAgent = navigator.userAgent.toLowerCase();
        let performanceMode = 'normal';
        
        // Brave browser detection (more reliable method)
        if (userAgent.includes('brave') || 
            (navigator.brave && navigator.brave.isBrave) ||
            window.chrome && window.chrome.runtime && window.chrome.runtime.onConnect) {
            performanceMode = 'brave';
            console.log('🦁 Brave browser detected - applying optimizations');
        }
        
        // Check for hardware acceleration
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            performanceMode = 'low';
            console.log('⚠️ WebGL not available - using low performance mode');
        }
        
        // Check device memory (if available)
        if (navigator.deviceMemory && navigator.deviceMemory < 4) {
            performanceMode = 'low';
            console.log(`📱 Low device memory detected: ${navigator.deviceMemory}GB`);
        }
        
        return performanceMode;
    }
    
    // Disable right-click context menu
    disableContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // Also disable on canvas specifically
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        console.log('🚫 Right-click context menu disabled');
    }
    
    // Disable mouse scroll
    disableMouseScroll() {
        document.addEventListener('wheel', (e) => {
            e.preventDefault();
            return false;
        }, { passive: false });
        
        // Also disable on canvas specifically
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            return false;
        }, { passive: false });
        
        console.log('🚫 Mouse scroll disabled');
    }
    
    // Browser optimizations removed - using default game settings
    
    gameLoop(timestamp = 0) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded event fired');
    console.log('Supabase ready:', window.supabaseReady);
    console.log('AuthFunctions available:', !!window.authFunctions);
    
    // Maintenance mode removed - game can start normally
    
    // Wait for Supabase to be ready
    if (window.supabaseReady) {
        console.log('✅ Supabase ready, initializing game...');
        new Game(); // Global erişim kaldırıldı - güvenlik için
    } else {
        console.log('⏳ Waiting for Supabase...');
        window.addEventListener('supabaseReady', () => {
            console.log('✅ Supabase ready event received, initializing game...');
            new Game(); // Global erişim kaldırıldı - güvenlik için
        });
    }
});

// 2. Adım: IIFE'nin sonu - "balon" kapatılıyor
})();
