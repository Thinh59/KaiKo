const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/App.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
  `        const getRealUsername = (id) => {
          if (!id || id === 'ai_bot') return id || '';
          const lastIndex = id.lastIndexOf('_');
          return lastIndex !== -1 ? id.substring(0, lastIndex) : id;
        };`,
  `        const getRealUsername = (id) => {
          if (!id || id === 'ai_bot') return id || '';
          return id.replace(/_\\d+$/, '');
        };`
);

content = content.replace(
  `    const getRealUsername = (id) => {
      if (!id || id === 'ai_bot') return id || '';
      const lastIndex = id.lastIndexOf('_');
      return lastIndex !== -1 ? id.substring(0, lastIndex) : id;
    };`,
  `    const getRealUsername = (id) => {
      if (!id || id === 'ai_bot') return id || '';
      return id.replace(/_\\d+$/, '');
    };`
);

// replace 2nd instance
content = content.replace(
  `    const getRealUsername = (id) => {
      if (!id || id === 'ai_bot') return id || '';
      const lastIndex = id.lastIndexOf('_');
      return lastIndex !== -1 ? id.substring(0, lastIndex) : id;
    };`,
  `    const getRealUsername = (id) => {
      if (!id || id === 'ai_bot') return id || '';
      return id.replace(/_\\d+$/, '');
    };`
);

fs.writeFileSync(filePath, content, 'utf-8');

const sbPath = path.join(__dirname, 'frontend/src/components/Scoreboard.jsx');
let sbContent = fs.readFileSync(sbPath, 'utf-8');
sbContent = sbContent.replace(
  `  const getRealUsername = (id) => {
    if (!id || id === 'ai_bot') return id || '';
    const lastIndex = id.lastIndexOf('_');
    return lastIndex !== -1 ? id.substring(0, lastIndex) : id;
  };`,
  `  const getRealUsername = (id) => {
    if (!id || id === 'ai_bot') return id || '';
    return id.replace(/_\\d+$/, '');
  };`
);
sbContent = sbContent.replace(
  `  const getRealUsername = (id) => {
    if (!id || id === 'ai_bot') return id || '';
    const lastIndex = id.lastIndexOf('_');
    return lastIndex !== -1 ? id.substring(0, lastIndex) : id;
  };`,
  `  const getRealUsername = (id) => {
    if (!id || id === 'ai_bot') return id || '';
    return id.replace(/_\\d+$/, '');
  };`
);

fs.writeFileSync(sbPath, sbContent, 'utf-8');
console.log('Regex updated');
