const fs = require('fs');
const path = require('path');

function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (/\.(ts|tsx|js|jsx)$/.test(file)) results.push(file);
        }
    });
    return results;
}

const files = walk('./components').concat(walk('./app'));
let count = 0;
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let newContent = content.replace(/'\/protected/g, "'/sigem").replace(/"\/protected/g, '"/sigem');
    if (content !== newContent) {
        fs.writeFileSync(f, newContent, 'utf8');
        console.log('Modified: ' + f);
        count++;
    }
});
console.log(`Replaced in ${count} files.`);
