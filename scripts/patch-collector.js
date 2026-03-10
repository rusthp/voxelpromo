const fs = require('fs');
const file = 'b:/voxelpromo/src/services/collector/CollectorService.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/this\.offerService\.saveOffers/g, 'this.saveAndDispatchOffers');
fs.writeFileSync(file, code);
console.log('Patched');
