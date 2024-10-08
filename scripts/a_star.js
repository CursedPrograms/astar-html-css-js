const grid = document.getElementById('grid');
        const startBtn = document.getElementById('startBtn');
        const resetBtn = document.getElementById('resetBtn');
        const obstacleBtn = document.getElementById('obstacleBtn');
        const rows = 20;
        const cols = 20;
        let start = null;
        let end = null;
        let walls = [];
        let cells = [];

        function createGrid() {
            grid.innerHTML = '';
            cells = [];
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = i;
                    cell.dataset.col = j;
                    cell.addEventListener('click', toggleCell);
                    grid.appendChild(cell);
                    cells.push(cell);
                }
            }
        }

        function toggleCell() {
            const row = parseInt(this.dataset.row);
            const col = parseInt(this.dataset.col);
            if (!start) {
                start = { row, col };
                this.classList.add('start');
            } else if (!end) {
                end = { row, col };
                this.classList.add('end');
            } else {
                this.classList.toggle('wall');
                const index = walls.findIndex(w => w.row === row && w.col === col);
                if (index > -1) {
                    walls.splice(index, 1);
                } else {
                    walls.push({ row, col });
                }
            }
        }

        function resetGrid() {
            start = null;
            end = null;
            walls = [];
            createGrid();
        }

        function addRandomObstacle() {
            const obstacleTypes = [
                () => addRectangle(),
                () => addCircle(),
                () => addLine()
            ];
            const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
            randomType();
        }

        function addRectangle() {
            const width = Math.floor(Math.random() * 5) + 3;
            const height = Math.floor(Math.random() * 5) + 3;
            const startRow = Math.floor(Math.random() * (rows - height));
            const startCol = Math.floor(Math.random() * (cols - width));

            for (let i = startRow; i < startRow + height; i++) {
                for (let j = startCol; j < startCol + width; j++) {
                    if (!isOccupied(i, j)) {
                        walls.push({ row: i, col: j });
                        cells[i * cols + j].classList.add('wall');
                    }
                }
            }
        }

        function addCircle() {
            const radius = Math.floor(Math.random() * 3) + 2;
            const centerRow = Math.floor(Math.random() * (rows - 2 * radius)) + radius;
            const centerCol = Math.floor(Math.random() * (cols - 2 * radius)) + radius;

            for (let i = centerRow - radius; i <= centerRow + radius; i++) {
                for (let j = centerCol - radius; j <= centerCol + radius; j++) {
                    if ((i - centerRow) ** 2 + (j - centerCol) ** 2 <= radius ** 2 && !isOccupied(i, j)) {
                        walls.push({ row: i, col: j });
                        cells[i * cols + j].classList.add('wall');
                    }
                }
            }
        }

        function addLine() {
            const isHorizontal = Math.random() < 0.5;
            if (isHorizontal) {
                const row = Math.floor(Math.random() * rows);
                const length = Math.floor(Math.random() * (cols - 5)) + 5;
                const startCol = Math.floor(Math.random() * (cols - length));
                for (let j = startCol; j < startCol + length; j++) {
                    if (!isOccupied(row, j)) {
                        walls.push({ row, col: j });
                        cells[row * cols + j].classList.add('wall');
                    }
                }
            } else {
                const col = Math.floor(Math.random() * cols);
                const length = Math.floor(Math.random() * (rows - 5)) + 5;
                const startRow = Math.floor(Math.random() * (rows - length));
                for (let i = startRow; i < startRow + length; i++) {
                    if (!isOccupied(i, col)) {
                        walls.push({ row: i, col });
                        cells[i * cols + col].classList.add('wall');
                    }
                }
            }
        }

        function isOccupied(row, col) {
            return (start && start.row === row && start.col === col) ||
                (end && end.row === row && end.col === col) ||
                walls.some(w => w.row === row && w.col === col);
        }

        function manhattanDistance(a, b) {
            return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
        }

        async function aStar() {
            if (!start || !end) {
                return null;
            }

            const openSet = [start];
            const closedSet = [];
            const cameFrom = {};
            const gScore = {};
            const fScore = {};

            gScore[`${start.row},${start.col}`] = 0;
            fScore[`${start.row},${start.col}`] = manhattanDistance(start, end);

            while (openSet.length > 0) {
                let current = openSet[0];
                let lowestFScore = fScore[`${current.row},${current.col}`];
                for (let i = 1; i < openSet.length; i++) {
                    const f = fScore[`${openSet[i].row},${openSet[i].col}`];
                    if (f < lowestFScore) {
                        current = openSet[i];
                        lowestFScore = f;
                    }
                }

                if (current.row === end.row && current.col === end.col) {
                    return reconstructPath(cameFrom, current);
                }

                openSet.splice(openSet.indexOf(current), 1);
                closedSet.push(current);

                const neighbors = getNeighbors(current);
                for (const neighbor of neighbors) {
                    if (closedSet.some(n => n.row === neighbor.row && n.col === neighbor.col)) {
                        continue;
                    }

                    const tentativeGScore = gScore[`${current.row},${current.col}`] + 1;

                    if (!openSet.some(n => n.row === neighbor.row && n.col === neighbor.col)) {
                        openSet.push(neighbor);
                    } else if (tentativeGScore >= gScore[`${neighbor.row},${neighbor.col}`]) {
                        continue;
                    }

                    cameFrom[`${neighbor.row},${neighbor.col}`] = current;
                    gScore[`${neighbor.row},${neighbor.col}`] = tentativeGScore;
                    fScore[`${neighbor.row},${neighbor.col}`] = gScore[`${neighbor.row},${neighbor.col}`] + manhattanDistance(neighbor, end);

                    cells[neighbor.row * cols + neighbor.col].classList.add('visited');
                }

                await new Promise(resolve => setTimeout(resolve, 50));
            }

            return null;
        }

        function getNeighbors(node) {
            const neighbors = [];
            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

            for (const [dx, dy] of directions) {
                const newRow = node.row + dx;
                const newCol = node.col + dy;

                if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
                    if (!walls.some(w => w.row === newRow && w.col === newCol)) {
                        neighbors.push({ row: newRow, col: newCol });
                    }
                }
            }

            return neighbors;
        }

        function reconstructPath(cameFrom, current) {
            const path = [current];
            while (cameFrom[`${current.row},${current.col}`]) {
                current = cameFrom[`${current.row},${current.col}`];
                path.unshift(current);
            }
            return path;
        }

        async function visualizePath() {
            if (!start || !end) {
                alert('Please set start and end points');
                return;
            }

            startBtn.disabled = true;
            const path = await aStar();
            if (path) {
                for (const node of path) {
                    if (node !== start && node !== end) {
                        cells[node.row * cols + node.col].classList.add('path');
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }
            } else {
                alert('No path found!');
            }
            startBtn.disabled = false;
        }

        createGrid();
        startBtn.addEventListener('click', visualizePath);
        resetBtn.addEventListener('click', resetGrid);
        obstacleBtn.addEventListener('click', addRandomObstacle);