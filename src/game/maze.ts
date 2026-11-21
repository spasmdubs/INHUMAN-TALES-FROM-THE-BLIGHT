import { ArenaBounds } from './iso';

export interface MazeWallRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: 'h' | 'v' | 'post';
  height: number;
}

export interface MazeCell {
  col: number;
  row: number;
  cx: number;
  cy: number;
  openN: boolean;
  openS: boolean;
  openE: boolean;
  openW: boolean;
}

export interface MazeLockedDoor {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  orientation: 'h' | 'v';
  height: number;
  cellA: { col: number; row: number };
  cellB: { col: number; row: number };
  unlocked: boolean;
}

export interface ProceduralMaze {
  seed: number;
  cols: number;
  rows: number;
  originX: number;
  originY: number;
  cellW: number;
  cellH: number;
  wallThickness: number;
  cells: MazeCell[][];
  walls: MazeWallRect[];
  lockedDoors: MazeLockedDoor[];
}

export const MAZE_COLS = 5;
export const MAZE_ROWS = 5;
export const MAZE_ORIGIN_X = 0.5;
export const MAZE_ORIGIN_Y = 0.5;
export const MAZE_CELL_W = 3.4; // 5 * 3.4 = 17.0 -> 0.5 .. 17.5 inside 18-wide chamber
export const MAZE_CELL_H = 2.6; // 5 * 2.6 = 13.0 -> 0.5 .. 13.5 inside 14-deep chamber
export const MAZE_WALL_THICK = 0.54;

/** Deterministic Mulberry32 PRNG */
export function createSeededRng(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mazeCellCenter(
  col: number,
  row: number,
  originX = MAZE_ORIGIN_X,
  originY = MAZE_ORIGIN_Y,
  cellW = MAZE_CELL_W,
  cellH = MAZE_CELL_H
): { x: number; y: number } {
  return {
    x: originX + (col + 0.5) * cellW,
    y: originY + (row + 0.5) * cellH,
  };
}

export function worldToMazeCell(
  x: number,
  y: number,
  maze: Pick<ProceduralMaze, 'cols' | 'rows' | 'originX' | 'originY' | 'cellW' | 'cellH'>
): { col: number; row: number } {
  const col = Math.max(0, Math.min(maze.cols - 1, Math.floor((x - maze.originX) / maze.cellW)));
  const row = Math.max(0, Math.min(maze.rows - 1, Math.floor((y - maze.originY) / maze.cellH)));
  return { col, row };
}

/**
 * Generates a fully connected procedural maze using Randomized Depth-First Search
 * (Recursive Backtracker) with light braiding so beat-'em-up combat has tactical loops
 * while preserving authentic winding stone labyrinth corridors.
 */
export function generateProceduralMaze(
  seed: number,
  cols = MAZE_COLS,
  rows = MAZE_ROWS
): ProceduralMaze {
  const rng = createSeededRng(seed);
  const originX = MAZE_ORIGIN_X;
  const originY = MAZE_ORIGIN_Y;
  const cellW = 17.0 / cols;
  const cellH = 13.0 / rows;
  const wallThickness = MAZE_WALL_THICK;

  const cells: MazeCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowArr: MazeCell[] = [];
    for (let c = 0; c < cols; c++) {
      const center = mazeCellCenter(c, r, originX, originY, cellW, cellH);
      rowArr.push({
        col: c,
        row: r,
        cx: center.x,
        cy: center.y,
        openN: false,
        openS: false,
        openE: false,
        openW: false,
      });
    }
    cells.push(rowArr);
  }

  // 1. Recursive Backtracker spanning tree starting from chamber center
  const visited = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const startC = Math.floor(cols / 2);
  const startR = Math.floor(rows / 2);
  const stack: { c: number; r: number }[] = [{ c: startC, r: startR }];
  visited[startR][startC] = true;

  const dirs = [
    { dc: 0, dr: -1, from: 'openN', to: 'openS' },
    { dc: 0, dr: 1, from: 'openS', to: 'openN' },
    { dc: 1, dr: 0, from: 'openE', to: 'openW' },
    { dc: -1, dr: 0, from: 'openW', to: 'openE' },
  ] as const;

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const unvisitedNeighbors: typeof dirs[number][] = [];

    for (const d of dirs) {
      const nc = cur.c + d.dc;
      const nr = cur.r + d.dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited[nr][nc]) {
        unvisitedNeighbors.push(d);
      }
    }

    if (unvisitedNeighbors.length === 0) {
      stack.pop();
      continue;
    }

    const pick = unvisitedNeighbors[Math.floor(rng() * unvisitedNeighbors.length)];
    const nc = cur.c + pick.dc;
    const nr = cur.r + pick.dr;
    cells[cur.r][cur.c][pick.from] = true;
    cells[nr][nc][pick.to] = true;
    visited[nr][nc] = true;
    stack.push({ c: nc, r: nr });
  }

  // 2. Light braiding (~16% of dead-ends) so melee flanking stays fluid while keeping rich shortcut walls
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      const degree =
        (cell.openN ? 1 : 0) + (cell.openS ? 1 : 0) + (cell.openE ? 1 : 0) + (cell.openW ? 1 : 0);
      if (degree === 1 && rng() < 0.16) {
        const closed = dirs.filter((d) => {
          const nc = c + d.dc;
          const nr = r + d.dr;
          return nc >= 0 && nc < cols && nr >= 0 && nr < rows && !cell[d.from];
        });
        if (closed.length > 0) {
          const extra = closed[Math.floor(rng() * closed.length)];
          const nc = c + extra.dc;
          const nr = r + extra.dr;
          cell[extra.from] = true;
          cells[nr][nc][extra.to] = true;
        }
      }
    }
  }

  // 2b. Identify 1-2 closed interior wall edges whose BFS detour is >= 3 cells to turn into Key-Locked Shortcut Doors
  const edgeDistance = (c1: number, r1: number, c2: number, r2: number): number => {
    const seen = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
    const q: { c: number; r: number; d: number }[] = [{ c: c1, r: r1, d: 0 }];
    seen[r1][c1] = true;
    while (q.length > 0) {
      const cur = q.shift()!;
      if (cur.c === c2 && cur.r === r2) return cur.d;
      const cell = cells[cur.r][cur.c];
      const nexts = [
        { c: cur.c, r: cur.r - 1, open: cell.openN },
        { c: cur.c, r: cur.r + 1, open: cell.openS },
        { c: cur.c + 1, r: cur.r, open: cell.openE },
        { c: cur.c - 1, r: cur.r, open: cell.openW },
      ];
      for (const n of nexts) {
        if (n.open && n.c >= 0 && n.c < cols && n.r >= 0 && n.r < rows && !seen[n.r][n.c]) {
          seen[n.r][n.c] = true;
          q.push({ c: n.c, r: n.r, d: cur.d + 1 });
        }
      }
    }
    return 999;
  };

  interface ShortcutCandidate {
    key: string;
    orientation: 'h' | 'v';
    c: number;
    r: number;
    detour: number;
  }
  const shortcutCandidates: ShortcutCandidate[] = [];

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c].openS) continue;
      const detour = edgeDistance(c, r, c, r + 1);
      if (detour >= 3) {
        shortcutCandidates.push({ key: `h:${c},${r}`, orientation: 'h', c, r, detour });
      }
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (cells[r][c].openE) continue;
      const detour = edgeDistance(c, r, c + 1, r);
      if (detour >= 3) {
        shortcutCandidates.push({ key: `v:${c},${r}`, orientation: 'v', c, r, detour });
      }
    }
  }

  // Deterministic Fisher-Yates shuffle weighted toward longer detours
  for (let i = shortcutCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shortcutCandidates[i];
    shortcutCandidates[i] = shortcutCandidates[j];
    shortcutCandidates[j] = tmp;
  }
  shortcutCandidates.sort((a, b) => b.detour - a.detour);

  const lockedEdgeKeys = new Set<string>();
  const pickedShortcuts: ShortcutCandidate[] = [];
  const desiredLockedDoors = shortcutCandidates.length >= 2 ? 2 : shortcutCandidates.length;
  for (const cand of shortcutCandidates) {
    if (pickedShortcuts.length >= desiredLockedDoors) break;
    const tooClose = pickedShortcuts.some(
      (p) => Math.abs(p.c - cand.c) + Math.abs(p.r - cand.r) < 2
    );
    if (tooClose && pickedShortcuts.length > 0) continue;
    pickedShortcuts.push(cand);
    lockedEdgeKeys.add(cand.key);
  }
  // Fallback if spatial spacing skipped candidates
  for (const cand of shortcutCandidates) {
    if (pickedShortcuts.length >= desiredLockedDoors) break;
    if (lockedEdgeKeys.has(cand.key)) continue;
    pickedShortcuts.push(cand);
    lockedEdgeKeys.add(cand.key);
  }

  // 3. Convert every closed internal wall edge into compact, depth-sortable stone wall segments or Locked Shortcut Doors
  const walls: MazeWallRect[] = [];
  const lockedDoors: MazeLockedDoor[] = [];
  const halfT = wallThickness * 0.5;
  const cornerUsed = Array.from({ length: rows + 1 }, () => Array<boolean>(cols + 1).fill(false));
  let wallSeq = 0;
  let doorSeq = 0;

  // Horizontal internal walls (between row r and r + 1)
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c].openS) continue;
      cornerUsed[r + 1][c] = true;
      cornerUsed[r + 1][c + 1] = true;

      const startX = originX + c * cellW + halfT;
      const totalSpan = Math.max(0.4, cellW - wallThickness);
      const wallY = originY + (r + 1) * cellH - halfT;

      if (lockedEdgeKeys.has(`h:${c},${r}`)) {
        lockedDoors.push({
          id: `mdoor_${++doorSeq}`,
          x: startX,
          y: wallY,
          w: totalSpan,
          h: wallThickness,
          cx: startX + totalSpan * 0.5,
          cy: wallY + wallThickness * 0.5,
          orientation: 'h',
          height: 15,
          cellA: { col: c, row: r },
          cellB: { col: c, row: r + 1 },
          unlocked: false,
        });
        continue;
      }

      const segLen = totalSpan * 0.5;
      for (let s = 0; s < 2; s++) {
        walls.push({
          id: `mh_${++wallSeq}`,
          x: startX + s * segLen,
          y: wallY,
          w: segLen,
          h: wallThickness,
          orientation: 'h',
          height: 13 + ((r + c + s) % 2) * 2,
        });
      }
    }
  }

  // Vertical internal walls (between col c and c + 1)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (cells[r][c].openE) continue;
      cornerUsed[r][c + 1] = true;
      cornerUsed[r + 1][c + 1] = true;

      const wallX = originX + (c + 1) * cellW - halfT;
      const startY = originY + r * cellH + halfT;
      const totalSpan = Math.max(0.4, cellH - wallThickness);

      if (lockedEdgeKeys.has(`v:${c},${r}`)) {
        lockedDoors.push({
          id: `mdoor_${++doorSeq}`,
          x: wallX,
          y: startY,
          w: wallThickness,
          h: totalSpan,
          cx: wallX + wallThickness * 0.5,
          cy: startY + totalSpan * 0.5,
          orientation: 'v',
          height: 15,
          cellA: { col: c, row: r },
          cellB: { col: c + 1, row: r },
          unlocked: false,
        });
        continue;
      }

      const segLen = totalSpan * 0.5;
      for (let s = 0; s < 2; s++) {
        walls.push({
          id: `mv_${++wallSeq}`,
          x: wallX,
          y: startY + s * segLen,
          w: wallThickness,
          h: segLen,
          orientation: 'v',
          height: 13 + ((r + c + s) % 2) * 2,
        });
      }
    }
  }

  // Interior stone corner posts where maze walls meet (no gaps, crisp medieval corners)
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (!cornerUsed[r][c]) continue;
      const postX = originX + c * cellW - halfT;
      const postY = originY + r * cellH - halfT;
      walls.push({
        id: `mp_${++wallSeq}`,
        x: postX,
        y: postY,
        w: wallThickness,
        h: wallThickness,
        orientation: 'post',
        height: 16,
      });
    }
  }

  return {
    seed,
    cols,
    rows,
    originX,
    originY,
    cellW,
    cellH,
    wallThickness,
    cells,
    walls,
    lockedDoors,
  };
}

/** Returns all currently solid blocking walls (stone segments + still-locked shortcut gates). */
export function getActiveMazeWalls(maze: ProceduralMaze): MazeWallRect[] {
  const active: MazeWallRect[] = [...maze.walls];
  for (const d of maze.lockedDoors) {
    if (!d.unlocked) {
      active.push({
        id: d.id,
        x: d.x,
        y: d.y,
        w: d.w,
        h: d.h,
        orientation: d.orientation,
        height: d.height,
      });
    }
  }
  return active;
}

/** Unlocks a locked maze shortcut door, opening the corridor for movement & BFS pathfinding. */
export function unlockMazeDoor(maze: ProceduralMaze, doorId: string): boolean {
  const door = maze.lockedDoors.find((d) => d.id === doorId && !d.unlocked);
  if (!door) return false;
  door.unlocked = true;

  const a = maze.cells[door.cellA.row]?.[door.cellA.col];
  const b = maze.cells[door.cellB.row]?.[door.cellB.col];
  if (a && b) {
    if (door.orientation === 'h') {
      a.openS = true;
      b.openN = true;
    } else {
      a.openE = true;
      b.openW = true;
    }
  }
  return true;
}

/** Finds the nearest still-locked shortcut door within interaction radius of the player. */
export function findNearbyLockedMazeDoor(
  maze: ProceduralMaze,
  px: number,
  py: number,
  radius = 1.45
): MazeLockedDoor | null {
  let best: MazeLockedDoor | null = null;
  let bestDist = radius;
  for (const door of maze.lockedDoors) {
    if (door.unlocked) continue;
    const dist = Math.hypot(px - door.cx, py - door.cy);
    if (dist <= bestDist) {
      bestDist = dist;
      best = door;
    }
  }
  return best;
}

/** Computes shortest BFS corridor step count between two maze cells (used for shortcut verification). */
export function getMazeCellShortestDistance(
  maze: ProceduralMaze,
  c1: number,
  r1: number,
  c2: number,
  r2: number
): number {
  const seen = Array.from({ length: maze.rows }, () => Array<boolean>(maze.cols).fill(false));
  const q: { c: number; r: number; d: number }[] = [{ c: c1, r: r1, d: 0 }];
  seen[r1][c1] = true;
  while (q.length > 0) {
    const cur = q.shift()!;
    if (cur.c === c2 && cur.r === r2) return cur.d;
    const cell = maze.cells[cur.r][cur.c];
    const nexts = [
      { c: cur.c, r: cur.r - 1, open: cell.openN },
      { c: cur.c, r: cur.r + 1, open: cell.openS },
      { c: cur.c + 1, r: cur.r, open: cell.openE },
      { c: cur.c - 1, r: cur.r, open: cell.openW },
    ];
    for (const n of nexts) {
      if (
        n.open &&
        n.c >= 0 &&
        n.c < maze.cols &&
        n.r >= 0 &&
        n.r < maze.rows &&
        !seen[n.r][n.c]
      ) {
        seen[n.r][n.c] = true;
        q.push({ c: n.c, r: n.r, d: cur.d + 1 });
      }
    }
  }
  return 999;
}

/** Verifies via BFS that every cell in the procedural maze is reachable from the center cell. */
export function isMazeFullyConnected(maze: ProceduralMaze): boolean {
  const visited = Array.from({ length: maze.rows }, () => Array<boolean>(maze.cols).fill(false));
  const startC = Math.floor(maze.cols / 2);
  const startR = Math.floor(maze.rows / 2);
  const queue: { c: number; r: number }[] = [{ c: startC, r: startR }];
  visited[startR][startC] = true;
  let count = 0;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    count++;
    const cell = maze.cells[cur.r][cur.c];
    const neighbors: { c: number; r: number; open: boolean }[] = [
      { c: cur.c, r: cur.r - 1, open: cell.openN },
      { c: cur.c, r: cur.r + 1, open: cell.openS },
      { c: cur.c + 1, r: cur.r, open: cell.openE },
      { c: cur.c - 1, r: cur.r, open: cell.openW },
    ];
    for (const n of neighbors) {
      if (
        n.open &&
        n.c >= 0 &&
        n.c < maze.cols &&
        n.r >= 0 &&
        n.r < maze.rows &&
        !visited[n.r][n.c]
      ) {
        visited[n.r][n.c] = true;
        queue.push({ c: n.c, r: n.r });
      }
    }
  }

  return count === maze.cols * maze.rows;
}

/** Smooth 2-pass circle-vs-AABB maze wall collision resolver (enables crisp wall-sliding). */
export function resolveMazeCollisions(
  x: number,
  y: number,
  radius: number,
  walls: MazeWallRect[]
): { x: number; y: number; collided: boolean } {
  let nx = x;
  let ny = y;
  let collided = false;

  for (let pass = 0; pass < 2; pass++) {
    for (const w of walls) {
      const closestX = Math.max(w.x, Math.min(nx, w.x + w.w));
      const closestY = Math.max(w.y, Math.min(ny, w.y + w.h));
      const dx = nx - closestX;
      const dy = ny - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        collided = true;
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          nx += (dx / dist) * overlap;
          ny += (dy / dist) * overlap;
        } else {
          // Entity center is inside wall rect — push out along shallowest axis
          const penLeft = nx - w.x;
          const penRight = w.x + w.w - nx;
          const penTop = ny - w.y;
          const penBottom = w.y + w.h - ny;
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) nx = w.x - radius;
          else if (minPen === penRight) nx = w.x + w.w + radius;
          else if (minPen === penTop) ny = w.y - radius;
          else ny = w.y + w.h + radius;
        }
      }
    }
  }

  return { x: nx, y: ny, collided };
}

/** Checks if a projectile or point intersects any solid stone maze wall. */
export function isPointInMazeWall(
  x: number,
  y: number,
  walls: MazeWallRect[],
  pad = 0.08
): boolean {
  for (const w of walls) {
    if (x >= w.x - pad && x <= w.x + w.w + pad && y >= w.y - pad && y <= w.y + w.h + pad) {
      return true;
    }
  }
  return false;
}

/**
 * Computes the next corridor waypoint along the shortest BFS path through the maze
 * so monsters intelligently navigate around walls to pursue Inhuman.
 */
export function findMazeNextWaypoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  maze: ProceduralMaze
): { x: number; y: number } {
  const start = worldToMazeCell(fromX, fromY, maze);
  const goal = worldToMazeCell(toX, toY, maze);

  if (start.col === goal.col && start.row === goal.row) {
    return { x: toX, y: toY };
  }

  // If goal is an immediately connected orthogonal neighbor cell, steer directly toward it
  const startCell = maze.cells[start.row][start.col];
  if (
    (goal.col === start.col && goal.row === start.row - 1 && startCell.openN) ||
    (goal.col === start.col && goal.row === start.row + 1 && startCell.openS) ||
    (goal.col === start.col + 1 && goal.row === start.row && startCell.openE) ||
    (goal.col === start.col - 1 && goal.row === start.row && startCell.openW)
  ) {
    return { x: toX, y: toY };
  }

  const visited = Array.from({ length: maze.rows }, () => Array<boolean>(maze.cols).fill(false));
  const parent: ({ c: number; r: number } | null)[][] = Array.from({ length: maze.rows }, () =>
    Array<{ c: number; r: number } | null>(maze.cols).fill(null)
  );
  const queue: { c: number; r: number }[] = [{ c: start.col, r: start.row }];
  visited[start.row][start.col] = true;

  let found = false;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.c === goal.col && cur.r === goal.row) {
      found = true;
      break;
    }
    const cell = maze.cells[cur.r][cur.c];
    const nexts = [
      { c: cur.c, r: cur.r - 1, open: cell.openN },
      { c: cur.c, r: cur.r + 1, open: cell.openS },
      { c: cur.c + 1, r: cur.r, open: cell.openE },
      { c: cur.c - 1, r: cur.r, open: cell.openW },
    ];
    for (const n of nexts) {
      if (
        n.open &&
        n.c >= 0 &&
        n.c < maze.cols &&
        n.r >= 0 &&
        n.r < maze.rows &&
        !visited[n.r][n.c]
      ) {
        visited[n.r][n.c] = true;
        parent[n.r][n.c] = cur;
        queue.push({ c: n.c, r: n.r });
      }
    }
  }

  if (!found) return { x: toX, y: toY };

  // Backtrack from goal to find the immediate next cell after start
  let step = { c: goal.col, r: goal.row };
  while (parent[step.r][step.c]) {
    const p = parent[step.r][step.c]!;
    if (p.c === start.col && p.r === start.row) break;
    step = p;
  }

  const nextCell = maze.cells[step.r][step.c];
  return { x: nextCell.cx, y: nextCell.cy };
}

/**
 * Picks guaranteed wall-free spawn points on open maze cell centers,
 * safely separated from avoidPoints (e.g., player entry position or doorways).
 */
export function pickMazeSpawnPoints(
  maze: ProceduralMaze,
  avoidPoints: { x: number; y: number }[],
  count: number,
  seed: number,
  minAvoidDist = 2.6,
  bounds?: ArenaBounds
): { x: number; y: number }[] {
  const rng = createSeededRng(seed);
  const candidates: { x: number; y: number }[] = [];

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const cell = maze.cells[r][c];
      if (bounds) {
        if (
          cell.cx < bounds.minX + 0.8 ||
          cell.cx > bounds.maxX - 0.8 ||
          cell.cy < bounds.minY + 0.8 ||
          cell.cy > bounds.maxY - 0.8
        ) {
          continue;
        }
      }
      const tooClose = avoidPoints.some(
        (pt) => Math.hypot(cell.cx - pt.x, cell.cy - pt.y) < minAvoidDist
      );
      if (!tooClose) {
        candidates.push({ x: cell.cx, y: cell.cy });
      }
    }
  }

  // Fisher-Yates shuffle with deterministic RNG
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }

  const results: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    if (candidates.length === 0) {
      results.push(mazeCellCenter(0, 0, maze.originX, maze.originY, maze.cellW, maze.cellH));
    } else {
      const base = candidates[i % candidates.length];
      // Slight sub-cell offset when multiple monsters share a chamber cell, clamped free of walls
      const jitterAngle = (i * 2.39996) % (Math.PI * 2);
      const jitterR = i >= candidates.length ? 0.55 : 0;
      const rawX = base.x + Math.cos(jitterAngle) * jitterR;
      const rawY = base.y + Math.sin(jitterAngle) * jitterR;
      const resolved = resolveMazeCollisions(rawX, rawY, 0.52, maze.walls);
      results.push({ x: resolved.x, y: resolved.y });
    }
  }

  return results;
}
