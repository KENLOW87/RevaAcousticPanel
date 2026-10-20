const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data', 'traffic-goal.json');

function loadGoal() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const data = JSON.parse(raw);
    return {
      start: typeof data.start === 'string' ? data.start : '',
      target: Number(data.target) || 0,
      until: typeof data.until === 'string' ? data.until : '',
    };
  } catch (e) {
    return { start: '', target: 0, until: '' };
  }
}

function saveGoal(goal) {
  fs.writeFileSync(FILE, JSON.stringify(goal, null, 2));
}

module.exports = { loadGoal, saveGoal };
