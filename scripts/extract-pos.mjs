import fs from 'node:fs'
const x = fs.readFileSync('src/components/home-page.tsx', 'utf8').split(/\n/)
const a = x.slice(29, 217).join('\n')
const b = x.slice(429, 803).join('\n')
fs.writeFileSync('src/components/pos-sale-view.tsx', `${a}\n\n${b}\n`)
