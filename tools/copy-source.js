const fs = require('fs');

let files = fs.readdirSync('src');
files.forEach((file) => {
    let resizable = fs.readFileSync('src/' + file).toString();
    fs.writeFileSync('dist/' + file, resizable);
});