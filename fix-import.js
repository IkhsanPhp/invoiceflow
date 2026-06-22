const fs = require('fs');
const verifyPath = 'app/dashboard/invoice-hub/verify/[id]/page.tsx';
let verifyCode = fs.readFileSync(verifyPath, 'utf8');

if (!verifyCode.includes('Edit2,')) {
    verifyCode = verifyCode.replace('RefreshCw', 'RefreshCw,\n    Edit2');
    fs.writeFileSync(verifyPath, verifyCode);
    console.log('Added Edit2 import');
} else {
    console.log('Edit2 already imported');
}
