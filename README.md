# 🎮 Opti Runner - Platform Game

<div align="center">
  <img src="assets/sprites/optimum2.webp" alt="Opti Runner Logo" width="200">
  
  [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/yourusername/opti-runner)
  [![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
  [![Made with](https://img.shields.io/badge/Made%20with-JavaScript-yellow?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
</div>

## 🚀 About the Game

**Opti Runner** is an exciting platform game developed with modern web technologies. Control your character to jump over obstacles, collect bonus items, and achieve high scores!

### ✨ Features

- 🎯 **Dynamic Gameplay**: Increasing difficulty level over time
- 🎵 **Music System**: Background music and sound effects
- 🏆 **Score System**: Local and global leaderboards
- 💎 **Bonus System**: Earn $OPTI tokens
- 🌤️ **Visual Effects**: Animated clouds and sprites
- 📱 **Responsive Design**: Perfect appearance on all devices
- 🎮 **Controls**: Simple and intuitive gameplay

## 🎮 How to Play

### Basic Controls
- **Spacebar**: Jump
- **ESC**: Pause game
- **Mouse**: Menu navigation

### Game Objective
- Run as far as possible by jumping over obstacles
- Collect bonus items to earn $OPTI tokens
- Achieve high scores to rank on the leaderboard
- Endure against increasing difficulty levels over time

### Game Mechanics
- **Obstacle System**: Stone obstacles of different sizes
- **Giant Obstacle System**: One giant obstacle every 10 obstacles
- **Speed Increase**: 20% speed increase every 10 seconds
- **Bonus Items**: Bonus items spawning every 5 seconds
- **Cloud Animation**: Dynamic cloud movement

## 🛠️ Technical Details

### Technologies Used
- **HTML5 Canvas**: Game graphics
- **Vanilla JavaScript**: Game logic
- **CSS3**: Modern UI design
- **Web Audio API**: Sound system
- **LocalStorage**: Data storage

### File Structure
```
Optimum Game/
├── assets/
│   ├── backgrounds/     # Background images
│   ├── images/         # General images
│   ├── music/          # Audio files
│   └── sprites/        # Game characters and objects
├── game.js             # Main game code
├── index.html          # Game main page
├── style.css           # Style file
└── README.md           # This file
```

### Browser Support
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 🚀 Installation

### Security Setup (IMPORTANT!)
Before running the game, you need to set up your Firebase configuration:

1. Copy `config.js` and fill in your Firebase credentials:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
    projectId: "YOUR_ACTUAL_PROJECT_ID",
    storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
    messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
    appId: "YOUR_ACTUAL_APP_ID",
    measurementId: "YOUR_ACTUAL_MEASUREMENT_ID"
};
```

2. **NEVER commit your actual API keys to git!**

### Local Development
1. Clone the project:
```bash
git clone https://github.com/yourusername/opti-runner.git
cd opti-runner
```

2. Start an HTTP server:
```bash
# With Python 3
python -m http.server 8000

# With Node.js
npx http-server

# With PHP
php -S localhost:8000
```

3. Open `http://localhost:8000` in your browser

### Live Demo
Play the game immediately: [Opti Runner Demo](https://yourusername.github.io/opti-runner)

## 🎨 Game Graphics

### Character Sprites
- Main character: 2 different animation frames
- Size: 54x72 pixels
- Physics: Realistic gravity and jumping

### Obstacles
- Stone obstacles: 2 different visuals
- Giant obstacles: One every 10 obstacles
- Dynamic sizing

### Bonus System
- $OPTI tokens
- Spawning every 5 seconds
- Score and token increase

## 🏆 Score System

### Point Calculation
- **Base Score**: +1 point for each frame
- **Bonus Multiplier**: Bonus item collection
- **$OPTI Tokens**: Local storage

### Leaderboard
- Global score ranking
- Username registration
- Real-time updates

## 🔧 Developer Notes

### Game Loop
- 60 FPS target frame rate
- Responsive canvas sizing
- Dynamic difficulty increase

### Performance Optimization
- Sprite caching
- Efficient collision detection
- Memory leak prevention

### Future Features
- [ ] Market system
- [ ] Character customization
- [ ] Power-ups
- [ ] Multiplayer mode
- [ ] Mobile app

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

**Opti Runner** - [GitHub Profile](https://github.com/yourusername)

## 🙏 Acknowledgments

- Game development community
- Open source projects
- Testing users

---

<div align="center">
  <p>⭐ Don't forget to star this project if you liked it!</p>
  <p>🎮 Have fun!</p>
</div>
