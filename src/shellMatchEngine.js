export const GRID_ROWS = 8;
export const GRID_COLS = 5;

export const ALL_SHELL_TYPES = [
  "shell-1",
  "shell-2",
  "shell-3",
  "shell-4",
  "shell-5",
  "shell-6",
  "shell-7",
];

export const LEVELS_1_TO_10 = Array.from({ length: 10 }, (_, idx) => {
  const level = idx + 1;
  const targetScore = level * 100;

  let shellCount = 4;
  if (level >= 9) shellCount = 7;
  else if (level >= 6) shellCount = 6;
  else if (level >= 3) shellCount = 5;

  const shellPenaltyBuffer = (shellCount - 4) * 2;
  const moves = 7 + level * 3 - Math.floor(shellPenaltyBuffer * 0.35);

  return {
    level,
    rows: GRID_ROWS,
    cols: GRID_COLS,
    targetScore,
    moves,
    shellCount,
    allowedShells: ALL_SHELL_TYPES.slice(0, shellCount),
    presetBlockers: [],
    presetBoosters: { hammer: 0, wave: 0 },
  };
});

export function getLevelConfig(levelNumber) {
  return LEVELS_1_TO_10.find((l) => l.level === levelNumber) || LEVELS_1_TO_10[0];
}

let uidCounter = 1;
function nextUid() {
  uidCounter += 1;
  return `shell_tile_${uidCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createCell(r, c, kind, options = {}) {
  return {
    r,
    c,
    piece: kind
      ? {
          id: nextUid(),
          kind,
          special: options.special || null,
        }
      : null,
    blocker: options.blocker || null,
  };
}

export function isAdjacent(a, b) {
  if (!a || !b) return false;
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function canSwapCell(cell) {
  if (!cell || !cell.piece) return false;
  if (cell.blocker && cell.blocker.movable === false) return false;
  return true;
}

export function findMatches(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const matches = [];
  const matchedKeys = new Set();

  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    while (runStart < cols) {
      const startKind = grid[r][runStart]?.piece?.kind;
      if (!startKind) {
        runStart += 1;
        continue;
      }
      let runEnd = runStart + 1;
      while (runEnd < cols && grid[r][runEnd]?.piece?.kind === startKind) {
        runEnd += 1;
      }
      if (runEnd - runStart >= 3) {
        const cells = [];
        for (let c = runStart; c < runEnd; c++) {
          cells.push({ r, c });
          matchedKeys.add(`${r},${c}`);
        }
        matches.push({ axis: "row", kind: startKind, cells });
      }
      runStart = runEnd;
    }
  }

  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    while (runStart < rows) {
      const startKind = grid[runStart][c]?.piece?.kind;
      if (!startKind) {
        runStart += 1;
        continue;
      }
      let runEnd = runStart + 1;
      while (runEnd < rows && grid[runEnd][c]?.piece?.kind === startKind) {
        runEnd += 1;
      }
      if (runEnd - runStart >= 3) {
        const cells = [];
        for (let r = runStart; r < runEnd; r++) {
          cells.push({ r, c });
          matchedKeys.add(`${r},${c}`);
        }
        matches.push({ axis: "col", kind: startKind, cells });
      }
      runStart = runEnd;
    }
  }

  return { matches, matchedKeys };
}

function cloneGrid(grid) {
  return grid.map((row) =>
    row.map((cell) => ({
      r: cell.r,
      c: cell.c,
      piece: cell.piece ? { ...cell.piece } : null,
      blocker: cell.blocker ? { ...cell.blocker } : null,
    }))
  );
}

function swapPiecesInClone(grid, posA, posB) {
  const next = cloneGrid(grid);
  const temp = next[posA.r][posA.c].piece;
  next[posA.r][posA.c].piece = next[posB.r][posB.c].piece;
  next[posB.r][posB.c].piece = temp;
  return next;
}

export function hasAnyValidMove(grid) {
  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!canSwapCell(grid[r][c])) continue;

      if (c + 1 < cols && canSwapCell(grid[r][c + 1])) {
        const testRight = swapPiecesInClone(grid, { r, c }, { r, c: c + 1 });
        if (findMatches(testRight).matches.length > 0) return true;
      }

      if (r + 1 < rows && canSwapCell(grid[r + 1][c])) {
        const testDown = swapPiecesInClone(grid, { r, c }, { r: r + 1, c });
        if (findMatches(testDown).matches.length > 0) return true;
      }
    }
  }

  return false;
}

export function createInitialBoard(levelConfig) {
  const { rows, cols, allowedShells, presetBlockers = [] } = levelConfig;

  const blockerMap = new Map();
  for (const b of presetBlockers) {
    blockerMap.set(`${b.r},${b.c}`, { ...b });
  }

  for (let attempt = 0; attempt < 60; attempt++) {
    const grid = [];

    for (let r = 0; r < rows; r++) {
      const row = [];

      for (let c = 0; c < cols; c++) {
        const blocker = blockerMap.get(`${r},${c}`) || null;
        const pool = [];

        for (let i = 0; i < allowedShells.length; i++) {
          const kind = allowedShells[i];
          const left1 = c >= 1 && row[c - 1]?.piece ? row[c - 1].piece.kind : null;
          const left2 = c >= 2 && row[c - 2]?.piece ? row[c - 2].piece.kind : null;
          if (left1 === kind && left2 === kind) continue;

          const up1 = r >= 1 && grid[r - 1]?.[c]?.piece ? grid[r - 1][c].piece.kind : null;
          const up2 = r >= 2 && grid[r - 2]?.[c]?.piece ? grid[r - 2][c].piece.kind : null;
          if (up1 === kind && up2 === kind) continue;

          pool.push(kind);
        }

        const finalPool = pool.length > 0 ? pool : allowedShells;
        const chosenKind = finalPool[Math.floor(Math.random() * finalPool.length)];
        row.push(createCell(r, c, chosenKind, { blocker }));
      }

      grid.push(row);
    }

    if (findMatches(grid).matches.length === 0 && hasAnyValidMove(grid)) {
      return grid;
    }
  }

  const fallbackGrid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(
        createCell(r, c, allowedShells[(r * 2 + c) % allowedShells.length])
      );
    }
    fallbackGrid.push(row);
  }
  return fallbackGrid;
}

function expandDestructionWithFutureHooks(grid, initialKeys) {
  const rows = grid.length;
  const cols = grid[0].length;
  const toDestroy = new Set(initialKeys);
  const queue = [...initialKeys];
  const visitedSpecial = new Set();

  while (queue.length > 0) {
    const key = queue.shift();
    const [r, c] = key.split(",").map(Number);
    const special = grid[r]?.[c]?.piece?.special;

    if (special && !visitedSpecial.has(key)) {
      visitedSpecial.add(key);
      if (special === "row_clear") {
        for (let cc = 0; cc < cols; cc++) {
          const k = `${r},${cc}`;
          if (!toDestroy.has(k)) {
            toDestroy.add(k);
            queue.push(k);
          }
        }
      } else if (special === "col_clear") {
        for (let rr = 0; rr < rows; rr++) {
          const k = `${rr},${c}`;
          if (!toDestroy.has(k)) {
            toDestroy.add(k);
            queue.push(k);
          }
        }
      } else if (special === "area_3x3") {
        for (let rr = Math.max(0, r - 1); rr <= Math.min(rows - 1, r + 1); rr++) {
          for (let cc = Math.max(0, c - 1); cc <= Math.min(cols - 1, c + 1); cc++) {
            const k = `${rr},${cc}`;
            if (!toDestroy.has(k)) {
              toDestroy.add(k);
              queue.push(k);
            }
          }
        }
      }
    }
  }

  return toDestroy;
}

function applyGravityAndRefill(grid, keysToClear, allowedShells) {
  const rows = grid.length;
  const cols = grid[0].length;
  const next = cloneGrid(grid);

  for (const key of keysToClear) {
    const [r, c] = key.split(",").map(Number);
    const cell = next[r][c];

    if (cell.blocker) {
      cell.blocker.hp -= 1;
      if (cell.blocker.hp <= 0) {
        cell.blocker = null;
      }
    }

    if (cell.piece) {
      cell.piece = null;
    }
  }

  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;

    for (let r = rows - 1; r >= 0; r--) {
      const cell = next[r][c];
      if (cell.blocker && cell.blocker.blocksGravity) {
        continue;
      }
      if (cell.piece) {
        if (writeRow !== r) {
          next[writeRow][c].piece = cell.piece;
          cell.piece = null;
        }
        writeRow -= 1;
      }
    }

    for (let r = writeRow; r >= 0; r--) {
      if (next[r][c].blocker && next[r][c].blocker.blocksGravity) continue;
      const randomKind =
        allowedShells[Math.floor(Math.random() * allowedShells.length)];
      next[r][c].piece = {
        id: nextUid(),
        kind: randomKind,
        special: null,
      };
    }
  }

  return next;
}

export function resolveSwapTurn(grid, posA, posB, levelConfig) {
  if (!isAdjacent(posA, posB)) {
    return { valid: false, reason: "not_adjacent" };
  }

  const cellA = grid[posA.r]?.[posA.c];
  const cellB = grid[posB.r]?.[posB.c];
  if (!canSwapCell(cellA) || !canSwapCell(cellB)) {
    return { valid: false, reason: "locked_cell" };
  }

  let workingGrid = swapPiecesInClone(grid, posA, posB);
  const firstCheck = findMatches(workingGrid);

  if (firstCheck.matches.length === 0) {
    return { valid: false, reason: "no_match" };
  }

  let totalScoreGain = 0;
  let cascadeStep = 0;
  const steps = [];

  while (true) {
    const { matches, matchedKeys } = findMatches(workingGrid);
    if (matches.length === 0) break;

    cascadeStep += 1;
    const expandedKeys = expandDestructionWithFutureHooks(workingGrid, matchedKeys);

    const basePoints = expandedKeys.size * 10;
    const lengthBonus = matches.reduce(
      (acc, m) => acc + Math.max(0, m.cells.length - 3) * 15,
      0
    );
    const cascadeMultiplier = 1 + (cascadeStep - 1) * 0.25;
    const stepScore = Math.round((basePoints + lengthBonus) * cascadeMultiplier);

    totalScoreGain += stepScore;
    steps.push({
      cascadeStep,
      clearedCount: expandedKeys.size,
      stepScore,
    });

    workingGrid = applyGravityAndRefill(
      workingGrid,
      expandedKeys,
      levelConfig.allowedShells
    );
  }

  let reshuffled = false;
  if (!hasAnyValidMove(workingGrid)) {
    workingGrid = createInitialBoard(levelConfig);
    reshuffled = true;
  }

  return {
    valid: true,
    grid: workingGrid,
    scoreGain: totalScoreGain,
    steps,
    reshuffled,
  };
}

export function applyHammerBreaker(grid, targetPos, levelConfig) {
  const { r, c } = targetPos;
  if (!grid[r]?.[c]) return { valid: false };

  const keys = new Set([`${r},${c}`]);
  const expanded = expandDestructionWithFutureHooks(grid, keys);
  let nextGrid = applyGravityAndRefill(grid, expanded, levelConfig.allowedShells);

  let extraScore = expanded.size * 10;
  while (true) {
    const { matchedKeys } = findMatches(nextGrid);
    if (matchedKeys.size === 0) break;
    const exp = expandDestructionWithFutureHooks(nextGrid, matchedKeys);
    extraScore += exp.size * 10;
    nextGrid = applyGravityAndRefill(nextGrid, exp, levelConfig.allowedShells);
  }

  return {
    valid: true,
    grid: nextGrid,
    scoreGain: extraScore,
  };
}