export function createWavePath(length = 1920) {
  let path = 'M-96 18 C-48 44 -16 44 32 18'
  for (let offset = 0; offset < length; offset += 256) {
    path += ` S${112 + offset} -8 ${160 + offset} 18 ${240 + offset} 44 ${288 + offset} 18`
  }
  return path
}
