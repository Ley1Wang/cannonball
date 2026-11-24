// The canvas is the drawing surface. Its 2D context provides the drawing methods.
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const playAgainButton = document.getElementById("play-again");
// The latest game snapshot from the Python server.
// It stays null until the first /state request succeeds.
let gameState = null;

// Store each player's keyboard aim in degrees.
// Index 0 belongs to Blue. Index 1 belongs to Orange.
let aimAngles = null;

// Limit repeated keyboard input while a request is still in progress.
let movePending = false;
let shotAnimating = false;

function groundY(x) {
    // Match ground_y() in game.py so the visible terrain and collision agree.
    // Canvas y coordinates increase downward.
    return 500 + Math.sin(x / 100) * 30;
}
function updateTeamPanel(id, tank, angle, isActive) {
    const panel = document.getElementById(id);
    panel.classList.toggle("is-active", isActive);

    panel.querySelector("p").textContent = [
        `HP: ${tank.hp}`,
        `Elevation: ${angle}°`,
        `Barrel: ${componentLabel(tank.canShoot, tank.barrelTurns)}`,
        `Tracks: ${componentLabel(tank.canMove, tank.wheelTurns)}`,
    ].join("\n");
}
function drawScene() {
    // Paint the sky over the entire canvas to clear the previous frame.
    ctx.fillStyle = "#b9def0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Trace the terrain surface from left to right, one x coordinate at a time.
    ctx.fillStyle = "#567d46";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);

    for (let x = 0; x <= canvas.width; x++) {
        ctx.lineTo(x, groundY(x));
    }

    // Close the shape along the bottom edge so fill() colors the land below the curve.
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // The sky and terrain can be drawn before the server sends the tank positions.
    if (gameState === null) return;

    const { T0, T1, currentPlayer, barrelAngles, shot, winner } = gameState;
    const canAim = !shot && winner === null;

    // Preview W/S adjustments immediately on the active tank.
    // Use the server's saved angles for the other tank and during projectile flight.
    const blueAngle = canAim && currentPlayer === 0
        ? aimAngles[0]
        : barrelAngles[0];
    const orangeAngle = canAim && currentPlayer === 1
        ? aimAngles[1]
        : barrelAngles[1];

    // Direction 1 faces right. Direction -1 faces left.
    // Pass the full tank state so the renderer can read its damaged components.
    drawTank(ctx, T0.x, T0.y, "#2874c7", 1, blueAngle, T0);
    drawTank(ctx, T1.x, T1.y, "#d65a38", -1, orangeAngle, T1);

    // The server supplies the projectile's position for the current frame.
    if (shot) {
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffdf57";
        ctx.fill();
    }

    //Draw the panel using function
    updateTeamPanel("blue-panel", T0, blueAngle, winner === null && currentPlayer === 0);
    updateTeamPanel("orange-panel", T1, orangeAngle, winner === null && currentPlayer === 1);

    // A winner of 0 means Blue won. A winner of 1 means Orange won.
    if (winner === 0 || winner === 1) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.font = "bold 36px sans-serif";
        ctx.fillStyle = winner === 0 ? "#17569a" : "#a83820";
        ctx.fillText(
            winner === 0 ? "Blue wins!" : "Orange wins!",
            canvas.width / 2,
            100
        );
        ctx.restore();
    }
}
// function of component label
function componentLabel(working, turns) {
    if (working === true) return "Operational";

    // Missing component data can occur if the backend has yet to expose the field.
    if (working !== false) return "Unavailable";

    // The countdown reaches zero before the component is enabled at turn start.
    return turns > 0 ? `Repairing (${turns} left)` : "Ready next turn";
}


async function loadGameState() {
    // Use the same state endpoint after loading the page, moving, or firing.
    const response = await fetch("/state");
    if (!response.ok) {
        throw new Error(`Failed to load game: ${response.status}`);
    }

    gameState = await response.json();
     // Show the button once the match has a winner.
    playAgainButton.hidden = gameState.winner == null;
    // Copy the server angles on the first load so later W/S changes stay local.
    aimAngles ??= [...gameState.barrelAngles];

    // Update the turn indicator, sidebar, and canvas from this snapshot.
    updateTurnStatus(gameState);
    drawScene();
}

document.addEventListener("keydown", async (event) => {
    if (event.target === playAgainButton) return;
    if (event.code === "Space") {
        // Prevent page scrolling and fire once per press.
        event.preventDefault();
        if (!event.repeat) fireAndAnimate().catch(console.error);
        return;
    }

    // Accept movement and aim input once the game is ready and between shots.
    if (!gameState || shotAnimating || gameState.winner !== null) return;

    const key = event.key.toLowerCase();

    if (key === "w" || key === "s") {
        const player = gameState.currentPlayer;
        const change = key === "w" ? 1 : -1;

        // W raises the barrel by one degree. S lowers it by one degree.
        // Clamp the result to the 0–80 degree range accepted by the server.
        aimAngles[player] = Math.max(0, Math.min(80, aimAngles[player] + change));
        drawScene();
        return;
    }

    // Holding A or D can generate repeated keydown events.
    // Wait for the current move and state refresh to finish before accepting another.
    if ((key !== "a" && key !== "d") || movePending) return;

    const direction = key === "a" ? "left" : "right";
    movePending = true;

    try {
        // The server checks whether the current tank can move and updates its position.
        const response = await fetch(`/move/${direction}`, { method: "POST" });
        if (!response.ok) {
            throw new Error(`Failed to move: ${response.status}`);
        }

        await loadGameState();
    } catch (error) {
        console.error(error);
    } finally {
        // Release the movement lock even when a request fails.
        movePending = false;
    }
});

async function fireAndAnimate() {
    // Prevent a second firing sequence while one is already running.
    if (!gameState || shotAnimating || gameState.winner !== null) return;
    shotAnimating = true;

    try {
        // Send the active player's aim. A tank with a broken barrel still sends
        // this request so the server can end its turn and count one repair turn.
        const angle = aimAngles[gameState.currentPlayer];
        const fire = await fetch("/fire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ angle }),
        });

        if (!fire.ok) {
            throw new Error(`Failed to fire: ${fire.status}`);
        }

        await loadGameState();

        // Ask Python to advance the projectile, then redraw from the new state.
        // When the server clears the projectile, gameState.shot becomes null.
        while (gameState.shot) {
            await new Promise(resolve => setTimeout(resolve, 33));

            const tick = await fetch("/tick", { method: "POST" });
            if (!tick.ok) {
                throw new Error(`Failed to update shot: ${tick.status}`);
            }

            await loadGameState();
        }
    } finally {
        // Release the firing lock even if a request fails during the animation.
        shotAnimating = false;
    }
}

function updateTurnStatus(state) {
    const status = document.getElementById("turn-status");
    const teams = ["Blue", "Orange"];
    const team = teams[state.currentPlayer];
    const tank = state.currentPlayer === 0 ? state.T0 : state.T1;
    let message = `${team}'s turn`;

    if (state.winner != null) {
        message = `${teams[state.winner]} wins!`;
    } else if (state.shot) {
        message = `${team}'s shot is in flight…`;
    } else if (tank.canShoot === false) {
        message = `${team}'s barrel is under repair. Press the fire key to skip.`;
    }

    if (status.textContent !== message) {
        status.textContent = message;
    }
}

// Draw the battlefield immediately while the first game snapshot loads.
drawScene();

// Event listener for play again button
playAgainButton.addEventListener("click", async () => {
    playAgainButton.disabled = true;

    try {
        const response = await fetch("/reset", { method: "POST" });
        if (!response.ok) {
            throw new Error(`Failed to restart: ${response.status}`);
        }

        // Let loadGameState copy the new match's default aim angles.
        aimAngles = null;
        await loadGameState();
    } catch (error) {
        console.error(error);
        document.getElementById("turn-status").textContent =
            "Could not restart. Please try again.";
    } finally {
        playAgainButton.disabled = false;
    }
});

loadGameState().catch(console.error);