const obstacleLines = [];
const obstacleCircles = [];
const rays = {};
const rayWorker = new Worker("./raycast.js");
rayWorker.onmessage = function(e) {
    const [i, ray] = e.data;
    rays[i] = ray;
}
const max = Math.max;
const min = Math.min;
const abs = Math.abs;
const dist = (x1, y1, x2, y2) => {
    return Math.hypot(x2 - x1, y2 - y1);
}
const createRectangle = (x, y, width, height) => {
    return [
        { x1: x, y1: y, x2: x + width, y2: y },
        { x1: x, y1: y, x2: x, y2: y + height },
        { x1: x + width, y1: y, x2: x + width, y2: y + height },
        { x1: x, y1: y + height, x2: x + width, y2: y + height },
    ]
}

const createPolygon = (x, y, radius, sides) => {
    let lines = [];
    let start;
    let last;
    let end;
    for (let i = 0; i < sides; i++) {
        let currPoint = {
            x: Math.cos((i / sides) * Math.PI * 2) * radius + x,
            y: Math.sin((i / sides) * Math.PI * 2) * radius + y
        }
        if (i === 0) {
            start = currPoint;
            last = currPoint;
            continue;
        }
        lines.push({
            x1: last.x,
            y1: last.y,
            x2: currPoint.x,
            y2: currPoint.y
        })
        if (i === sides - 1) {
            end = currPoint;
        }
        last = currPoint;
    }
    lines.push({
        x1: end.x,
        y1: end.y,
        x2: start.x,
        y2: start.y
    });
    return lines;
}
const xyToMxb = (line) => {
    const m = (line.y2 - line.y1) / (line.x2 - line.x1);
    return {
        m,
        b: line.y1 - m * line.x1
    }
}

const isHorizontal = (line) => {
    return line.y1 === line.y2;
}

const isVertical = (line) => {
    return line.x1 === line.x2;
}
const isClose = (a, b) => {
    return abs(a - b) <= max(1e-9 * max(abs(a), abs(b)), 0);
}
const intersect = (line1, line2) => {
    if (isVertical(line2)) {
        return intersectVertical(line1, line2);
    }
    if (isVertical(line1)) {
        return intersectVertical(line2, line1);
    }
    const oldLine2 = line2;
    const oldLine1 = line1;
    line1 = xyToMxb(line1);
    line2 = xyToMxb(line2);
    const x = (line2.b - line1.b) / (line1.m - line2.m);
    const y = line1.m * x + line1.b;
    return {
        intersect: onSegment(oldLine2.x1, oldLine2.y1, x, y, oldLine2.x2, oldLine2.y2) && onSegment(oldLine1.x1, oldLine1.y1, x, y, oldLine1.x2, oldLine1.y2),
        point: { x, y }
    }
}
const intersectVertical = (line, vertical) => {
    const oldLine1 = line;
    const x = vertical.x1;
    line = xyToMxb(line);
    const y = line.m * x + line.b;
    return {
        intersect: onSegment(vertical.x1, vertical.y1, x, y, vertical.x2, vertical.y2) && onSegment(oldLine1.x1, oldLine1.y1, x, y, oldLine1.x2, oldLine1.y2),
        point: { x, y }
    }
}
const intersectCircle = (line, circle) => {
    const oldLine = line;
    line = xyToMxb(line);
    const m = line.m;
    const b = line.b;
    const h = circle.x;
    const k = circle.y;
    const r = circle.r;
    const x1 = (
        (-h - k * m + m * b + Math.sqrt(-1 * m ** 2 * h ** 2 + 2 * k * m * h - 2 * m * b * h + 2 * k * b + m ** 2 * r ** 2 + r ** 2 - k ** 2 - b ** 2)) /
        (-1 - m ** 2)
    );
    const x2 = (
        (-h - k * m + m * b - Math.sqrt(-1 * m ** 2 * h ** 2 + 2 * k * m * h - 2 * m * b * h + 2 * k * b + m ** 2 * r ** 2 + r ** 2 - k ** 2 - b ** 2)) /
        (-1 - m ** 2)
    );
    const y1 = m * x1 + b;
    const y2 = m * x2 + b;
    return [{
        intersect: onSegment(oldLine.x1, oldLine.y1, x1, y1, oldLine.x2, oldLine.y2),
        point: { x: x1, y: y1 }
    }, {
        intersect: onSegment(oldLine.x1, oldLine.y1, x2, y2, oldLine.x2, oldLine.y2),
        point: { x: x2, y: y2 }
    }];
}
const onSegment = (x1, y1, px, py, x2, y2) => {
    return isClose(dist(x1, y1, px, py) + dist(px, py, x2, y2), dist(x1, y1, x2, y2));
}
const perpendicularLine = (line, point) => {
    return {
        m: -(1 / line.m),
        b: point.y + (point.x / line.m)
    }
}
const perpendicularDistance = (line, point) => {
    let oldLine = line;
    if (isHorizontal(line)) {
        let lowerBound;
        let upperBound;
        if (line.x1 > line.x2) {
            upperBound = line.x1;
            lowerBound = line.x2;
        } else {
            upperBound = line.x2;
            lowerBound = line.x1;
        }
        if (point.x < lowerBound || point.x > upperBound) {
            return Infinity;
        }
        return Math.abs(line.y1 - point.y);
    }
    if (isVertical(line)) {
        let lowerBound;
        let upperBound;
        if (line.y1 > line.y2) {
            upperBound = line.y1;
            lowerBound = line.y2;
        } else {
            upperBound = line.y2;
            lowerBound = line.y1;
        }
        if (point.y < lowerBound || point.y > upperBound) {
            return Infinity;
        }
        return Math.abs(line.x1 - point.x);
    }
    line = xyToMxb(line);
    const pline = perpendicularLine(line, point);
    const x = (pline.b - line.b) / (line.m - pline.m);
    const y = line.m * x + line.b;
    if (!onSegment(oldLine.x1, oldLine.y1, x, y, oldLine.x2, oldLine.y2)) {
        return Infinity;
    }
    return dist(x, y, point.x, point.y);
}

window.onload = () => {
    obstacleLines.push(...createRectangle(100, 200, 300, 100));
    obstacleLines.push(...createRectangle(275, 400, 65, 65));
    obstacleLines.push(...createRectangle(300, 500, 50, 50));
    obstacleLines.push(...createRectangle(100, 400, 100, 100));
    obstacleLines.push(...createPolygon(700, 300, 100, 5));
    obstacleLines.push(...createPolygon(600, 150, 100, 3));
    obstacleLines.push(...createPolygon(800, 500, 110, 7));
    obstacleLines.push(...createRectangle(800, 100, 100, 100));
    obstacleCircles.push({ x: 500, y: 300, r: 50 });
    obstacleCircles.push({ x: 375, y: 100, r: 80 });
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    let prevFrame = performance.now();
    setInterval(() => {
        const delta = performance.now() - prevFrame;
        stats.begin();
        tick++;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 1000, 650);
        obstacleLines.forEach(oLine => {
            ctx.lineWidth = 10;
            ctx.strokeStyle = "rgb(100, 100, 100)"
            ctx.beginPath();
            ctx.moveTo(oLine.x1, oLine.y1);
            ctx.lineTo(oLine.x2, oLine.y2);
            ctx.stroke();
        });
        obstacleCircles.forEach(oCircle => {
            ctx.lineWidth = 10;
            ctx.strokeStyle = "rgb(100, 100, 100)"
            ctx.beginPath();
            ctx.arc(oCircle.x, oCircle.y, oCircle.r, 0, Math.PI * 2);
            ctx.stroke();
        })
        const futureCam = {...camera };
        if (keys["ArrowRight"]) {
            futureCam.x += 2 * (delta / 16.66);
        }
        if (keys["ArrowLeft"]) {
            futureCam.x -= 2 * (delta / 16.66);
        }
        if (keys["ArrowUp"]) {
            futureCam.y -= 2 * (delta / 16.66);
        }
        if (keys["ArrowDown"]) {
            futureCam.y += 2 * (delta / 16.66);
        }
        let moved = false;
        if (obstacleLines.every(oLine => perpendicularDistance(oLine, futureCam) > 5) && obstacleCircles.every(oCircle => dist(oCircle.x, oCircle.y, futureCam.x, futureCam.y) > oCircle.r + 5)) {
            if (camera.x !== futureCam.x || camera.y !== futureCam.y) {
                moved = true;
            }
            camera = futureCam;
        }
        for (let i = 0.0001; i < Math.PI * 2; i += (Math.PI * 2) / 1000) {
            /*if (moved) {
                rayWorker.postMessage([camera, i, obstacleLines]);
            }*/
            if (rays[i]) {
                ctx.lineWidth = 1;
                ctx.strokeStyle = "white";
                ctx.beginPath();
                ctx.moveTo(rays[i].x1, rays[i].y1);
                ctx.lineTo(rays[i].x2, rays[i].y2);
                ctx.stroke();
            }
            ray.x1 = camera.x;
            ray.y1 = camera.y;
            ray.x2 = camera.x + 1100 * Math.cos(i);
            ray.y2 = camera.y + 1100 * Math.sin(i);
            // stroke(255);
            //  strokeWeight(1);
            // line(ray.x1, ray.y1, ray.x2, ray.y2);
            let possiblePoints = [];
            obstacleLines.some(oLine => {
                const i = intersect(ray, oLine);
                if (i.intersect) {
                    possiblePoints.push({ x: i.point.x, y: i.point.y });
                }
            });
            obstacleCircles.some(oCircle => {
                const i = intersectCircle(ray, oCircle);
                i.forEach(point => {
                    if (point.intersect) {
                        possiblePoints.push({ x: point.point.x, y: point.point.y });
                    }
                });
            });

            let closestDist = Infinity;
            let closestPoint;
            possiblePoints.forEach(point => {
                if (dist(camera.x, camera.y, point.x, point.y) < closestDist) {
                    closestPoint = point;
                    closestDist = dist(camera.x, camera.y, point.x, point.y);
                }
            })

            if (closestPoint) {
                rays[i] = { x1: ray.x1, y1: ray.y1, x2: closestPoint.x, y2: closestPoint.y };
            } else {
                rays[i] = {...ray };
            }
        }
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(camera.x, camera.y, 10, 0, 2 * Math.PI);
        ctx.fill();
        stats.end();
        prevFrame = performance.now();
    }, 1000 / 60)
}
let tick = 0;
let camera = { x: 500, y: 500 };
const keys = {};
let ray = {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
}

document.onkeydown = (e) => { keys[e.key] = true; }

document.onkeyup = (e) => { keys[e.key] = false; }
var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);