const CLOUDINARY_RE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload)\/(.*)$/

export function optimizeImage(url: string, width = 400): string {
  const m = url.match(CLOUDINARY_RE)
  if (!m) return url
  return `${m[1]}/c_fill,w_${width},f_auto,q_auto/${m[2]}`
}
