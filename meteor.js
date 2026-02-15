function initialzeGame(div, config = {
    width: 500,
    height: 600,
    aiInitialMovementRange: 1,
    aiInitialShootCooldown: 1000,
    aiCanGetStronger: true,
    aiCanGetWeaker: true,
    scoreBoardShowRounds: true,
    scoreBoardShowCpuSpeed: false,
    meteorAmount: 1,
    superMeteor: true,
    aiShootSuperMeteor: true,
    superMeteorHeightAdvantage: 20
}) {
    div.style.width = config.width + 'px';
    div.style.height = config.height + 'px';
    div.style.position = 'relative';
    div.style.overflow = 'hidden';

    let speed = 10;
    let bulletSpeed = 25;
    let playerScore = 0;
    let aiScore = 0;
    let roundsWon = 0;
    let roundsLost = 0;
    let playerHeightBonus = 0;
    let aiHeightBonus = 0;

    // MARK: CREATE METEOR
    // a meteor is created at a random position at the top of the screen, falls down at a constant speed,
    // and is removed when it goes off the bottom of the screen.
    function createMeteor(n = 1) {
        for (let i = 0; i < n; i++) {
            let meteor = document.createElement('div');
            meteor.style.width = '20px';
            meteor.style.height = '20px';
            meteor.style.position = 'absolute';
            meteor.style.left = Math.random() * (config.width - 20) + 'px';
            meteor.style.top = '0px';
            meteor.classList.add('game-meteor');
            div.appendChild(meteor);

            let interval = setInterval(() => {
                let top = parseInt(meteor.style.top);
                if (top > config.height) {
                    clearInterval(interval);
                    destroyMeteor(meteor);
                    createMeteor();
                } else {
                    meteor.style.top = top + speed + 'px';
                }
            }, 50);
            meteor._interval = interval;
        }

        if (config.superMeteor && Math.random() < 0.1) {
            createSuperMeteor();
        }
    }
    createMeteor(config.meteorAmount);

    // MARK: CREATE SUPER METEOR
    // super meteors are the same as regular meteors but smaller, move diagonaly,
    // and when shot move the player 20px up until the end of the round
    function createSuperMeteor() {
        let meteor = document.createElement('div');
        meteor.style.width = '12px';
        meteor.style.height = '12px';
        meteor.style.position = 'absolute';
        meteor.style.left = Math.random() * (config.width - 12) + 'px';
        meteor.style.top = '0px';
        meteor.classList.add('game-meteor', 'game-super-meteor');
        meteor.dataset.super = "true";
        div.appendChild(meteor);

        let dx = Math.random() < 0.5 ? -1 : 1; // diagonal direction

        playSound('sound/special.wav')

        let interval = setInterval(() => {
            let top = parseInt(meteor.style.top);
            let left = parseInt(meteor.style.left);

            if (top > config.height || left < -20 || left > config.width + 20) {
                clearInterval(interval);
                destroyMeteor(meteor);
            } else {
                meteor.style.top = top + speed + 'px';
                meteor.style.left = left + (speed * 0.5 * dx) + 'px';
            }
        }, 50);

        meteor._interval = interval;
    }

    // MARK: PLAYER
    // the player is created at the bottom of the screen, can be moved horizontaly with the mouse,
    // can shoot bullets upwards by clicking the mouse, and is removed when it collides with a meteor.
    let player = document.createElement('div');
    player.style.width = '50px';
    player.style.height = '15px';
    player.style.position = 'absolute';
    player.style.left = (config.width / 2 - 20) + 'px';
    player.style.top = (config.height - 40 - 10 - playerHeightBonus) + 'px';
    player.className = 'game-player';
    div.appendChild(player);

    // move the player with the mouse
    div.addEventListener('mousemove', (event) => {
        let rect = div.getBoundingClientRect();
        let x = event.clientX - rect.left - 20;
        if (x < 0) x = 0;
        if (x > config.width - 40) x = config.width - 40;
        player.style.left = x + 'px';
    });

    // shoot bullets upwards by clicking the mouse
    div.addEventListener('mousedown', (event) => {
        playerShoot();
    });

    // also shoot with right click, to make it easier to butterfly click
    div.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        playerShoot();
    });

    function playerShoot() {
        let bullet = document.createElement('div');
        bullet.style.width = '2px';
        bullet.style.height = '32px';
        bullet.style.position = 'absolute';
        bullet.style.left = (parseInt(player.style.left) + 17.5) + 'px';
        bullet.style.top = (parseInt(player.style.top) - 10) + 'px';
        bullet.classList.add('game-bullet');
        div.appendChild(bullet);

        playSound('sound/laserShoot.wav', 0.5, 1);

        let interval = setInterval(() => {
            let top = parseInt(bullet.style.top);
            if (top < 0) {
                clearInterval(interval);
                destroyBullet(bullet);
            } else {
                bullet.style.top = top - 10 + 'px';
            }
        }, bulletSpeed);
    }

    // MARK: DESTROY
    function destroyMeteor(meteor) {
        if (meteor._interval) {
            clearInterval(meteor._interval);
            meteor._interval = null;
        }
        if (meteor.parentNode) {
            meteor.parentNode.removeChild(meteor);
        }
    }

    function destroyBullet(bullet) {
        if (bullet.parentNode) {
            bullet.parentNode.removeChild(bullet);
        }
    }

    // MARK: COLLISION
    // bullets destroy meteors on collision
    setInterval(() => {
        let bullets = div.getElementsByClassName('game-bullet');
        let aiBullets = div.getElementsByClassName('game-ai-bullet');
        let meteors = div.getElementsByClassName('game-meteor');
        // MARK: player shot collision
        for (let bullet of bullets) {
            let bulletRect = bullet.getBoundingClientRect();

            for (let meteor of meteors) {
                let meteorRect = meteor.getBoundingClientRect();

                if (bulletRect.left < meteorRect.right &&
                    bulletRect.right > meteorRect.left &&
                    bulletRect.top < meteorRect.bottom &&
                    bulletRect.bottom > meteorRect.top) {

                    if (!meteor.classList.contains('exploding')) {

                        meteor.classList.add('game-meteor-explode-player', 'exploding');

                        if (meteor._interval) {
                            clearInterval(meteor._interval);
                            meteor._interval = null;
                        }

                        destroyBullet(bullet);

                        // super meteor check
                        let isSuper = meteor.classList.contains('game-super-meteor');

                        if (isSuper) {
                            playSound('sound/powerUp.wav')
                            // super meteor height advantage
                            playerHeightBonus += config.superMeteorHeightAdvantage;

                            player.style.top =
                                (config.height - 40 - 10 - playerHeightBonus) + 'px';
                        } else {
                            playerScore += 1;
                            playSound('sound/explosion.wav', 0.5, 1);
                        }

                        // wait for animation before remove
                        setTimeout(() => {
                            destroyMeteor(meteor);

                            // only recreates normal meteors
                            if (!meteor.classList.contains('game-super-meteor')) {
                                createMeteor();
                            }
                        }, 500);
                    }

                    break;
                }
            }
        }

        // MARK: cpu shot collision
        for (let aiBullet of aiBullets) {
            let bulletRect = aiBullet.getBoundingClientRect();

            for (let meteor of meteors) {
                let meteorRect = meteor.getBoundingClientRect();

                if (bulletRect.left < meteorRect.right &&
                    bulletRect.right > meteorRect.left &&
                    bulletRect.top < meteorRect.bottom &&
                    bulletRect.bottom > meteorRect.top) {

                    if (!meteor.classList.contains('exploding')) {

                        meteor.classList.add('game-meteor-explode-ai', 'exploding');

                        if (meteor._interval) {
                            clearInterval(meteor._interval);
                            meteor._interval = null;
                        }

                        destroyBullet(aiBullet);

                        // super meteor check
                        let isSuper = meteor.classList.contains('game-super-meteor');

                        if (isSuper) {
                            playSound('sound/powerUp.wav')
                            // super meteor height advantage
                            aiHeightBonus += config.superMeteorHeightAdvantage;

                            ai.style.top =
                                (config.height - 40 - 10 - aiHeightBonus) + 'px';
                        } else {
                            aiScore += 1;
                            playSound('sound/explosion.wav', 0.5, 1);
                        }

                        setTimeout(() => {
                            destroyMeteor(meteor);

                            // only recreates normal meteors
                            if (!meteor.classList.contains('game-super-meteor')) {
                                createMeteor();
                            }
                        }, 500);
                    }

                    break;
                }
            }
        }
    }, 50);

    // MARK: SCORE BOARD
    function createScoreLabel() {
        let scoreLabel = document.createElement('div');
        scoreLabel.style.position = 'absolute';
        scoreLabel.style.left = '10px';
        scoreLabel.style.top = '10px';
        scoreLabel.style.fontSize = '20px';
        scoreLabel.style.userSelect = 'none';
        scoreLabel.innerText = '0';
        scoreLabel.className = 'game-score';
        div.appendChild(scoreLabel);

        setInterval(() => {
            scoreLabel.innerHTML = `
                        <span class="player-score">YOU ${playerScore}</span> - <span class="ai-score">${aiScore} CPU</span>
                        ${config.scoreBoardShowRounds && roundsWon > 0 ? `<br><span class="rounds-won"> won : ${roundsWon}</span>` : ''}
                        ${config.scoreBoardShowRounds && roundsLost > 0 ? `<br><span class="rounds-lost"> lost: ${roundsLost}</span>` : ''}
                        ${config.scoreBoardShowCpuSpeed ? `<br><span class="cpu-speed">${(1000 / aiShootCooldown).toFixed(2)}Hz</span>` : ''}
                    `;

            if (playerScore >= 10) {
                playerScore = 0;
                aiScore = 0;
                playerHeightBonus = 0;
                aiHeightBonus = 0;

                player.style.top = (config.height - 40 - 10) + 'px';
                ai.style.top = (config.height - 40 - 10) + 'px';

                roundsWon += 1;
                if (config.aiCanGetStronger) {
                    aiShootCooldown = Math.max(100, aiShootCooldown - 15); // reduce shoot cooldown by 15ms (min 100ms = 10Hz)
                    aiMovementRange += 0.2; // increase movement range by 0.2 (no max)
                }
            } else if (aiScore >= 10) {
                playerScore = 0;
                aiScore = 0;
                playerHeightBonus = 0;
                aiHeightBonus = 0;

                player.style.top = (config.height - 40 - 10) + 'px';
                ai.style.top = (config.height - 40 - 10) + 'px';

                roundsLost += 1;
                if (config.aiCanGetWeaker) {
                    aiShootCooldown += 15; // increase shoot cooldown by 15ms (no max)
                    aiMovementRange = Math.max(1, aiMovementRange - 0.2); // decrease movement range by 0.2 (min 1)
                }
            }
        }, 100);
    }

    createScoreLabel();

    // MARK: CPU ADVERSARY
    // the AI adversary is created at the bottom of the screen, along with the player,
    // moves horizontally on the direction of the nearest meteor, and shoots bullets upwards when a meteor is above it.
    let ai = document.createElement('div');
    ai.style.width = '50px';
    ai.style.height = '15px';
    ai.style.position = 'absolute';
    ai.style.left = (config.width / 2 - 20) + 'px';
    ai.style.top = (config.height - 40 - 10 - aiHeightBonus) + 'px';
    ai.className = 'game-ai';
    div.appendChild(ai);

    let aiLastShootTime = 0;
    let aiMovementRange = config.aiInitialMovementRange;
    let aiShootCooldown = config.aiInitialShootCooldown; // milliseconds between shots

    setInterval(() => {
        let meteors = div.getElementsByClassName('game-meteor');
        if (meteors.length > 0) {
            let nearestMeteor = null;
            let nearestDistance = Infinity;
            for (let meteor of meteors) {
                let meteorRect = meteor.getBoundingClientRect();
                let aiRect = ai.getBoundingClientRect();
                let distance = Math.sqrt(Math.pow(meteorRect.left - aiRect.left, 2) + Math.pow(meteorRect.top - aiRect.top, 2));
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestMeteor = meteor;
                }
            }
            if (nearestMeteor) {
                let meteorRect = nearestMeteor.getBoundingClientRect();
                let aiRect = ai.getBoundingClientRect();
                // move toward meteor in horizontal jumps between 1 and aiMovementRange,
                // but never overshoot (keeps precision when very close)
                let dx = Math.round(meteorRect.left - aiRect.left);
                if (dx !== 0) {
                    let stepRand = Math.floor(Math.random() * aiMovementRange) + 1; // 1..aiMovementRange
                    let step = Math.min(stepRand, Math.abs(dx)); // don't overshoot
                    let x = parseInt(ai.style.left);
                    if (dx < 0) {
                        // move left
                        ai.style.left = Math.max(0, x - step) + 'px';
                    } else {
                        // move right
                        ai.style.left = Math.min(config.width - 40, x + step) + 'px';
                    }
                }
                // shoot only if meteor is directly above and cooldown has passed
                if (meteorRect.top < aiRect.top &&
                    Math.abs(meteorRect.left - aiRect.left) < 20 &&
                    Date.now() - aiLastShootTime > aiShootCooldown) {
                    let bullet = document.createElement('div');
                    bullet.style.width = '2px';
                    bullet.style.height = '32px';
                    bullet.style.position = 'absolute';
                    bullet.style.left = (parseInt(ai.style.left) + 17.5) + 'px';
                    bullet.style.top = (parseInt(ai.style.top) - 10) + 'px';
                    bullet.classList.add('game-ai-bullet');
                    div.appendChild(bullet);

                    playSound('sound/laserShoot.wav', 0.5, 1);

                    let interval = setInterval(() => {
                        let top = parseInt(bullet.style.top);
                        if (top < 0) {
                            clearInterval(interval);
                            destroyBullet(bullet);
                        } else {
                            bullet.style.top = top - 10 + 'px';
                        }
                    }, bulletSpeed);

                    aiLastShootTime = Date.now();
                }
            }
        }
    }, 1);

    function playSound(src, volume = 1, pitch = 1) {
        let audio = new Audio(src);
        audio.volume = volume;
        audio.playbackRate = pitch;
        audio.play();
    }
}
