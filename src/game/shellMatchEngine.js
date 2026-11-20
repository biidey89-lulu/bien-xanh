export const GRID_ROWS = 8;
export const GRID_COLS = 5;

export const ALL_SHELL_KINDS = [
  "shell-1",
  "shell-2",
  "shell-3",
  "shell-4",
  "shell-5",
  "shell-6",
  "shell-7",
];

// Số lượt đã giảm còn 1/2 so với cấu hình gốc, giữ nguyên mốc điểm mục tiêu 20 màn
export const LEVELS_1_TO_20 = [
  { level: 1, shellCount: 4, targetScore: 300, moves: 15 },
  { level: 2, shellCount: 4, targetScore: 540, moves: 15 },
  { level: 3, shellCount: 5, targetScore: 840, moves: 15 },
  { level: 4, shellCount: 5, targetScore: 1200, moves: 15 },
  { level: 5, shellCount: 5, targetScore: 1650, moves: 14 },
  { level: 6, shellCount: 6, targetScore: 2100, moves: 14 },
  { level: 7, shellCount: 6, targetScore: 2700, moves: 14 },
  { level: 8, shellCount: 6, targetScore: 3300, moves: 14 },
  { level: 9, shellCount: 7, targetScore: 3900, moves: 13 },
  { level: 10, shellCount: 7, targetScore: 4500, moves: 13 },
  { level: 11, shellCount: 7, targetScore: 5100, moves: 13 },
  { level: 12, shellCount: 7, targetScore: 5700, moves: 13 },
  { level: 13, shellCount: 7, targetScore: 6300, moves: 13 },
  { level: 14, shellCount: 7, targetScore: 6900, moves: 13 },
  { level: 15, shellCount: 7, targetScore: 7500, moves: 13 },
  { level: 16, shellCount: 7, targetScore: 8100, moves: 12 },
  { level: 17, shellCount: 7, targetScore: 8700, moves: 12 },
  { level: 18, shellCount: 7, targetScore: 9300, moves: 12 },
  { level: 19, shellCount: 7, targetScore: 9900, moves: 12 },
  { level: 20, shellCount: 7, targetScore: 10800, moves: 12 },
];

export const LEVELS_1_TO_10 = LEVELS_1_TO_20;

let pieceUidCounter = 1;

function nextPieceId(kind) {
  pieceUidCounter += 1;
  return `${kind}-${pieceUidCounter}`;
}

export function getLevelConfig(levelNumber) {
  const num = Number(levelNumber) || 1;
  return (
    LEVELS_1_TO_20.find((lvl) => lvl.level === num) || LEVELS_1_TO_20[0]
  );
}

export function getAllowedShellKinds(levelConfig) {
  const count = Math.min(
    ALL_SHELL_KINDS.length,
    Math.max(3, Number(levelConfig?.shellCount) || 4)
  );
  return ALL_SHELL_KINDS.slice(0, count);
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function cloneGrid(grid) {
  return grid.map((row) =>
    row.map((cell) => ({
      r: cell.r,
      c: cell.c,
      piece: cell.piece
        ? {
            id: cell.piece.id,
            kind: cell.piece.kind,
            justDropped: Boolean(cell.piece.justDropped),
          }
        : null,
    }))
  );
}

export function isAdjacent(posA, posB) {
  if (!posA || !posB) return false;
  const dr = Math.abs(posA.r - posB.r);
  const dc = Math.abs(posA.c - posB.c);
  return dr + dc === 1;
}

export function swapCellsInGrid(grid, posA, posB) {
  const next = cloneGrid(grid);
  const temp = next[posA.r][posA.c].piece;
  next[posA.r][posA.c].piece = next[posB.r][posB.c].piece;
  next[posB.r][posB.c].piece = temp;
  return next;
}

export function findMatches(grid) {
  const matchedSet = new Set();
  const groups = [];

  // Quét hàng ngang
  for (let r = 0; r < GRID_ROWS; r += 1) {
    let c = 0;
    while (c < GRID_COLS) {
      const kind = grid[r][c]?.piece?.kind;
      if (!kind) {
        c += 1;
        continue;
      }
      let end = c + 1;
      while (end < GRID_COLS && grid[r][end]?.piece?.kind === kind) {
        end += 1;
      }
      const len = end - c;
      if (len >= 3) {
        const cells = [];
        for (let k = c; k < end; k += 1) {
          cells.push({ r, c: k });
          matchedSet.add(`${r},${k}`);
        }
        groups.push({ kind, length: len, cells });
      }
      c = end;
    }
  }

  // Quét cột dọc
  for (let c = 0; c < GRID_COLS; c += 1) {
    let r = 0;
    while (r < GRID_ROWS) {
      const kind = grid[r][c]?.piece?.kind;
      if (!kind) {
        r += 1;
        continue;
      }
      let end = r + 1;
      while (end < GRID_ROWS && grid[end][c]?.piece?.kind === kind) {
        end += 1;
      }
      const len = end - r;
      if (len >= 3) {
        const cells = [];
        for (let k = r; k < end; k += 1) {
          cells.push({ r: k, c });
          matchedSet.add(`${k},${c}`);
        }
        groups.push({ kind, length: len, cells });
      }
      r = end;
    }
  }

  return {
    hasMatch: matchedSet.size > 0,
    matchedKeys: matchedSet,
    groups,
  };
}

export function getMatchedKeysForSwap(grid, posA, posB) {
  if (!isAdjacent(posA, posB)) return null;
  const swappedGrid = swapCellsInGrid(grid, posA, posB);
  const matchInfo = findMatches(swappedGrid);
  if (!matchInfo.hasMatch) return null;
  return {
    swappedGrid,
    clearingKeys: matchInfo.matchedKeys,
    groups: matchInfo.groups,
  };
}

export function clearAndDropGrid(grid, matchedKeys, allowedKinds) {
  const next = cloneGrid(grid);

  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < GRID_COLS; c += 1) {
      if (matchedKeys.has(`${r},${c}`)) {
        next[r][c].piece = null;
      } else if (next[r][c].piece) {
        next[r][c].piece.justDropped = false;
      }
    }
  }

  for (let c = 0; c < GRID_COLS; c += 1) {
    let writeRow = GRID_ROWS - 1;
    for (let r = GRID_ROWS - 1; r >= 0; r -= 1) {
      const piece = next[r][c].piece;
      if (piece) {
        if (writeRow !== r) {
          next[writeRow][c].piece = {
            ...piece,
            justDropped: true,
          };
          next[r][c].piece = null;
        } else {
          next[writeRow][c].piece = {
            ...piece,
            justDropped: false,
          };
        }
        writeRow -= 1;
      }
    }

    for (let r = writeRow; r >= 0; r -= 1) {
      const kind = randomFrom(allowedKinds);
      next[r][c].piece = {
        id: nextPieceId(kind),
        kind,
        justDropped: true,
      };
    }
  }

  return next;
}

export function findValidMoves(grid) {
  const moves = [];

  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < GRID_COLS; c += 1) {
      if (!grid[r][c]?.piece?.kind) continue;

      if (c + 1 < GRID_COLS && grid[r][c + 1]?.piece?.kind) {
        const posA = { r, c };
        const posB = { r, c: c + 1 };
        const testGrid = swapCellsInGrid(grid, posA, posB);
        const matchInfo = findMatches(testGrid);
        if (matchInfo.hasMatch) {
          moves.push({
            posA,
            posB,
            clearedCount: matchInfo.matchedKeys.size,
            groupCount: matchInfo.groups.length,
          });
        }
      }

      if (r + 1 < GRID_ROWS && grid[r + 1][c]?.piece?.kind) {
        const posA = { r, c };
        const posB = { r: r + 1, c };
        const testGrid = swapCellsInGrid(grid, posA, posB);
        const matchInfo = findMatches(testGrid);
        if (matchInfo.hasMatch) {
          moves.push({
            posA,
            posB,
            clearedCount: matchInfo.matchedKeys.size,
            groupCount: matchInfo.groups.length,
          });
        }
      }
    }
  }

  return moves;
}

export function findBestHintPair(grid) {
  const moves = findValidMoves(grid);
  if (!moves.length) return null;

  moves.sort((a, b) => {
    if (b.clearedCount !== a.clearedCount) {
      return b.clearedCount - a.clearedCount;
    }
    return b.groupCount - a.groupCount;
  });

  return moves[0];
}

export function shuffleBoardWithoutMatches(grid, allowedKinds, { dropIn = false } = {}) {
  const kindsPool = [];
  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < GRID_COLS; c += 1) {
      kindsPool.push(grid[r][c]?.piece?.kind || randomFrom(allowedKinds));
    }
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const shuffled = [...kindsPool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const candidate = Array.from({ length: GRID_ROWS }, (_, r) =>
      Array.from({ length: GRID_COLS }, (__, c) => {
        const kind = shuffled[r * GRID_COLS + c];
        return {
          r,
          c,
          piece: {
            id: nextPieceId(kind),
            kind,
            justDropped: dropIn,
          },
        };
      })
    );

    const matchInfo = findMatches(candidate);
    if (!matchInfo.hasMatch && findValidMoves(candidate).length > 0) {
      return candidate;
    }
  }

  return createInitialBoard({ shellCount: allowedKinds.length }, { dropIn });
}

export function createInitialBoard(levelConfig, { dropIn = false } = {}) {
  const allowedKinds = getAllowedShellKinds(levelConfig);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const builtGrid = [];

    for (let r = 0; r < GRID_ROWS; r += 1) {
      const rowCells = [];
      for (let c = 0; c < GRID_COLS; c += 1) {
        const forbidden = new Set();

        if (
          c >= 2 &&
          rowCells[c - 1]?.piece?.kind &&
          rowCells[c - 1]?.piece?.kind === rowCells[c - 2]?.piece?.kind
        ) {
          forbidden.add(rowCells[c - 1].piece.kind);
        }

        if (
          r >= 2 &&
          builtGrid[r - 1]?.[c]?.piece?.kind &&
          builtGrid[r - 1]?.[c]?.piece?.kind === builtGrid[r - 2]?.[c]?.piece?.kind
        ) {
          forbidden.add(builtGrid[r - 1][c].piece.kind);
        }

        const candidates = allowedKinds.filter((k) => !forbidden.has(k));
        const kind = randomFrom(candidates.length ? candidates : allowedKinds);

        rowCells.push({
          r,
          c,
          piece: {
            id: nextPieceId(kind),
            kind,
            justDropped: dropIn,
          },
        });
      }
      builtGrid.push(rowCells);
    }

    const matchInfo = findMatches(builtGrid);
    if (!matchInfo.hasMatch && findValidMoves(builtGrid).length > 0) {
      return builtGrid;
    }
  }

  return Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (__, c) => {
      const kind = allowedKinds[(r * 2 + c) % allowedKinds.length];
      return {
        r,
        c,
        piece: {
          id: nextPieceId(kind),
          kind,
          justDropped: dropIn,
        },
      };
    })
  );
}

// Hệ số nhân theo độ dài chuỗi vỏ sò:
// - 3 vỏ sò: 1x (30đ)
// - 4 vỏ sò: 1.5x (45đ)
// - 5+ vỏ sò: 2.5x + 0.5x mỗi vỏ sò vượt quá 5 (75đ cho chuỗi 5)
export function getMatchLengthMultiplier(length) {
  if (length >= 5) {
    return 2.5 + (length - 5) * 0.5;
  }
  if (length === 4) {
    return 1.5;
  }
  return 1;
}

export function calculateMatchScore(groups, comboStep = 1) {
  const baseUnitPoints = 30;
  let totalGroupPoints = 0;

  for (const g of groups) {
    const lengthMultiplier = getMatchLengthMultiplier(g.length);
    totalGroupPoints += baseUnitPoints * lengthMultiplier;
  }

  const comboMultiplier = 1 + Math.max(0, comboStep - 1) * 0.25;
  return Math.round(totalGroupPoints * comboMultiplier);
}

export function resolveSwapTurn(grid, posA, posB, levelConfig) {
  if (!isAdjacent(posA, posB)) {
    return { valid: false, reason: "not_adjacent" };
  }

  const allowedKinds = getAllowedShellKinds(levelConfig);
  let workingGrid = swapCellsInGrid(grid, posA, posB);
  const firstMatch = findMatches(workingGrid);

  if (!firstMatch.hasMatch) {
    return { valid: false, reason: "no_match" };
  }

  let totalScore = 0;
  let comboStep = 0;
  let currentMatch = firstMatch;
  const steps = [];

  while (currentMatch.hasMatch && comboStep < 12) {
    comboStep += 1;
    const stepScore = calculateMatchScore(currentMatch.groups, comboStep);
    totalScore += stepScore;

    steps.push({
      comboStep,
      score: stepScore,
      clearedCount: currentMatch.matchedKeys.size,
      groups: currentMatch.groups,
    });

    workingGrid = clearAndDropGrid(
      workingGrid,
      currentMatch.matchedKeys,
      allowedKinds
    );
    currentMatch = findMatches(workingGrid);
  }

  let reshuffled = false;
  if (findValidMoves(workingGrid).length === 0) {
    workingGrid = shuffleBoardWithoutMatches(workingGrid, allowedKinds, {
      dropIn: true,
    });
    reshuffled = true;
  }

  return {
    valid: true,
    grid: workingGrid,
    scoreGain: totalScore,
    steps,
    reshuffled,
  };
}