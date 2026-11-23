const {execFile} =  require('child_process');
const path = require('path');
const binary_path = path.join(__dirname, 'core.exe');
async function open_target(target_path){
    return new Promise((resolve, reject) => {
        execFile(binary_path, ['open', target_path], (error, stdout, stderr) => {
            if (error) {
               return reject(error.message);
            }
            if(stderr){
                return reject(stderr);
            } else {
                return resolve(stdout.trim());
            }
        });
    });
}
async function searchFiles(base_path, search_term) {
    return new Promise((resolve, reject) => {
        execFile(binary_path, ['search', base_path, search_term], (error, stdout, stderr) => {
            if (error) {
                return reject(error.message);
            }
            if(stderr){
                return reject(stderr);
            } 
            const rawLines = stdout.split('\n');
            const cleanPaths = [];
            for (let line of rawLines) {
                line = line.trim();
                if (line.startsWith('[Found]')) {
                    const cleanPath = line.replace('[Found]', '').trim();
                    cleanPaths.push(cleanPath);
                }
            }
            resolve(cleanPaths);
        });
    });
}
module.exports = {
    open_target,
    searchFiles
};