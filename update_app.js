const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/App.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

const getRealUsernameBlock = `
    const getRealUsername = (id) => {
      if (!id || id === 'ai_bot') return id || '';
      const lastIndex = id.lastIndexOf('_');
      return lastIndex !== -1 ? id.substring(0, lastIndex) : id;
    };
    const oppRealUser = getRealUsername(currentMatch?.opponentId);
`;

const lines = content.split(/\r?\n/);

let insert1 = -1, insert2 = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("} else if (page === 'debate') {")) {
        for(let j=i; j<i+50; j++) {
            if (lines[j].includes('const roomData = {')) {
                insert1 = j;
                break;
            }
        }
    }
    if (lines[i].includes("} else if (page === 'text_debate') {")) {
        for(let j=i; j<i+50; j++) {
            if (lines[j].includes('const roomData = {')) {
                insert2 = j;
                break;
            }
        }
    }
}

if (insert2 !== -1) {
    lines.splice(insert2, 0, ...getRealUsernameBlock.split('\n'));
}

if (insert1 !== -1) {
    lines.splice(insert1, 0, ...getRealUsernameBlock.split('\n'));
}

content = lines.join('\n');
content = content.replace(/rawUsernameA:\s*isHost\s*\?\s*username\s*:\s*currentMatch\?.opponentId/g, 'rawUsernameA: isHost ? username : oppRealUser');
content = content.replace(/rawUsernameB:\s*isHost\s*\?\s*currentMatch\?.opponentId\s*:\s*username/g, 'rawUsernameB: isHost ? oppRealUser : username');

fs.writeFileSync(filePath, content, 'utf-8');
console.log("App.jsx updated correctly!");
