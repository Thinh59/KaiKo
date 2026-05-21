const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/Scoreboard.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

const getRealUsername = `
  const getRealUsername = (id) => {
    if (!id || id === 'ai_bot') return id || '';
    const lastIndex = id.lastIndexOf('_');
    return lastIndex !== -1 ? id.substring(0, lastIndex) : id;
  };
`;

content = content.replace('const isOpponent', getRealUsername + '\n  const isOpponent');
content = content.replace('target: rawName', 'target: getRealUsername(rawName)');

content = content.replace('const reviewee = result.rawUsernameA === currentUser ? result.rawUsernameB : result.rawUsernameA',
getRealUsername + '\n  const revieweeId = result.rawUsernameA === currentUser ? result.rawUsernameB : result.rawUsernameA;\n  const reviewee = getRealUsername(revieweeId);');

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Scoreboard updated");
