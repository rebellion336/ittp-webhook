export const comma = number => {
  return `${number}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export const removecomma = number => {
  let satang = number
  for (let i = 0; i < number.length / 3; i += 1) {
    satang = `${satang}`.replace(',', '')
  }
  return satang
}
