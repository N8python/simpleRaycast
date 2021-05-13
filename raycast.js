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
const max = Math.max;
const min = Math.min;
const abs = Math.abs;
const dist = (x1, y1, x2, y2) => {
    return Math.hypot(x2 - x1, y2 - y1);
}
self.onmessage = function(e) {
    const [camera, i, obstacleLines] = e.data;
    const ray = {};
    ray.x1 = camera.x;
    ray.y1 = camera.y;
    ray.x2 = camera.x + 1000 * Math.cos(i);
    ray.y2 = camera.y + 1000 * Math.sin(i);
    let possiblePoints = [];
    obstacleLines.some(oLine => {
        const i = intersect(ray, oLine);
        if (i.intersect) {
            possiblePoints.push({ x: i.point.x, y: i.point.y });
        }
    });

    let closestDist = Infinity;
    let closestPoint;
    possiblePoints.forEach(point => {
        if (dist(camera.x, camera.y, point.x, point.y) < closestDist) {
            closestPoint = point;
            closestDist = dist(camera.x, camera.y, point.x, point.y);
        }
    });
    if (closestPoint) {
        postMessage([i, { x1: ray.x1, y1: ray.y1, x2: closestPoint.x, y2: closestPoint.y }])
    } else {
        postMessage([i, {...ray }])
    }
}