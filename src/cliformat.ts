import * as path from 'path';
import * as fs from 'fs';
import {format} from './prettyprint';
import * as commander from 'commander';

let program = commander.option('-i --inplace', 'edit the files in place')
    .parse(process.argv);


let inplace = !!(program as any)['inplace'] || false;

let changed = 0;
program.args.forEach((file:string) => {
    let fileName = file;
    if (!fileName.startsWith('/')) {
        fileName = path.resolve(process.cwd(), fileName);
    }

    if (inplace) {
        console.log('processing', file);
    }

    let source = fs.readFileSync(fileName).toString();
    let pretty = format(source);
    if (pretty != source) {
        changed++;
    }
    if (inplace) {
        fs.writeFileSync(fileName, pretty);
    } else {
        process.stdout.write(pretty);
    }
});
if(inplace) {
    console.log(changed + ' file' + (changed == 1 ? '' : 's') + ' files changed');
    let skipped = program.args.length - changed;
    console.log(skipped + ' file' + (skipped == 1 ? '' : 's') + ' files unchanged');
}
