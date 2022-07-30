// encrypt a password
// usage: deno run passwd.js plaintext

import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts"

const plain = Deno.args[0] || 'plaintext'
console.time('bcrypt')
const hash = bcrypt.hashSync(plain);
const result = bcrypt.compareSync(plain, hash);
console.timeEnd('bcrypt')
console.log(plain, '⇒', hash, '⇒', result)
