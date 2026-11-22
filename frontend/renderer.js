function drawArmorShape(ctx, points, color, direction) {
    const top = Math.min(...points.map(([, y]) => y));
    const bottom = Math.max(...points.map(([, y]) => y));
    const shading = ctx.createLinearGradient(0, top, 0, bottom);
    shading.addColorStop(0, "rgba(255, 255, 255, 0.26)");
    shading.addColorStop(0.28, "rgba(255, 255, 255, 0.07)");
    shading.addColorStop(1, "rgba(0, 0, 0, 0.24)");

    // Mirror the outline so each tank's sloped front faces its opponent.
    ctx.beginPath();
    ctx.moveTo(points[0][0] * direction, points[0][1]);
    for (const [x, y] of points.slice(1)) {
        ctx.lineTo(x * direction, y);
    }
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = shading;
    ctx.fill();
    ctx.stroke();
}
function drawTank(ctx, x, y, color, direction = 1, angle = 0) {

    // make slope
    const slope = (groundY(x + 1) - groundY(x - 1)) / 2;
    const tilt = Math.atan(slope);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(1.5, 1.5);
    ctx.translate(0, 4);
    // Draw Stroke
    ctx.strokeStyle = "#17202a";
    ctx.lineWidth = 1;  
    // Draw Body
    // Draw the sloped hull, roof hatch, and low turret.
    const hull = [[-30, -20], [-30, -31], [-23, -36], [17, -36], [30, -28], [27, -20]];
    const hatch = [[-15, -48], [-14, -51], [-7, -51], [-6, -48]];
    const turret = [[-23, -36], [-23, -42], [-15, -48], [3, -48], [9, -45], [9, -40], [4, -36]];

    drawArmorShape(ctx, hull, color, direction);
    drawArmorShape(ctx, hatch, color, direction);
    drawArmorShape(ctx, turret, color, direction);

    // Mount the barrel at the front of the turret.
    const pivotX = direction * 9;
    ctx.save();
    ctx.translate(pivotX, -44);
    ctx.rotate(-direction * angle * Math.PI / 180);
    ctx.scale(direction, 1);
    
    ctx.fillStyle = color;
    ctx.fillRect(0, -2, 35, 4);
    ctx.strokeRect(0, -2, 35, 4);

    // 
    ctx.fillStyle = "#59636e";
    ctx.fillRect(31, -3.5, 10, 7);
    ctx.strokeRect(31, -3.5, 10, 7);

    // 
    ctx.fillStyle = "#17202a";
    ctx.fillRect(34, -2.5, 1, 5);
    ctx.fillRect(37, -2.5, 1, 5);
    ctx.restore();
    // Draw Wheel
    ctx.fillStyle = "#252525";
    ctx.beginPath();
    ctx.roundRect(-36, -20, 72, 16, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#777777";
    for (let wheelX of [-28, -14, 0, 14, 28]) {
        ctx.beginPath();
        ctx.arc(wheelX, -12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}