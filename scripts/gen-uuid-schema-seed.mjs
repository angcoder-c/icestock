/** Genera fragmentos SQL de UUIDs determinísticos (versión 4 / variante RFC). */
function u(mask, n) {
  const last = n.toString(16).padStart(12, '0')
  return `${mask}-${last.slice(0, 4)}-4${last.slice(4, 7)}-8${last.slice(7, 10)}-${last.slice(10, 12)}${last.slice(0, 10)}`.replace(
    /^(.{8})-(.{4})-(.{4})-(.{4})-(.{12})$/,
    (_, a, b, c, d, e) => `${a}-${b}-${c}-${d}-${e.slice(0, 12)}`,
  )
}
// Stable readable: prefix 8 hex + rest
function uid(prefixHex8, seq) {
  const s = seq.toString(16).padStart(12, '0')
  return `${prefixHex8}-${s.slice(0, 4)}-4${s.slice(4, 7)}-8${s.slice(7, 10)}-${s.slice(2, 14)}`
}

for (let i = 1; i <= 3; i++) {
  console.log('test', i, uid('10000000', i))
}
