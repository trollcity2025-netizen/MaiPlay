// SVG placeholder images as data URLs
// These are used as fallbacks when actual images fail to load

// Thumbnail placeholder - gray gradient with "Thumbnail" label
export const PLACEHOLDER_THUMBNAIL = 
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">' +
    '<defs>' +
    '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" style="stop-color:#2a2a2a"/>' +
    '<stop offset="100%" style="stop-color:#1a1a1a"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<rect width="400" height="225" fill="url(#bg)"/>' +
    '<rect x="20" y="20" width="60" height="45" fill="#333" stroke="#444" stroke-width="2"/>' +
    '<text x="200" y="115" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#666" text-anchor="middle">Thumbnail</text>' +
    '<text x="200" y="140" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#555" text-anchor="middle">No preview available</text>' +
    '</svg>'
  )

// Music placeholder - purple/red gradient with music note
export const PLACEHOLDER_MUSIC = 
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
    '<defs>' +
    '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" style="stop-color:#4a154b"/>' +
    '<stop offset="100%" style="stop-color:#9d174d"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<rect width="400" height="400" fill="url(#bg)"/>' +
    '<circle cx="200" cy="180" r="60" fill="none" stroke="#fbbf24" stroke-width="4" opacity="0.8"/>' +
    '<text x="200" y="190" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="#fbbf24" text-anchor="middle">♪</text>' +
    '<text x="200" y="270" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#f472b6" text-anchor="middle">Music Cover</text>' +
    '</svg>'
  )

// Avatar placeholder - gradient circle with initials
export const PLACEHOLDER_AVATAR = 
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
    '<defs>' +
    '<linearGradient id="avatar" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" style="stop-color:#0ea5e9"/>' +
    '<stop offset="100%" style="stop-color:#8b5cf6"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<circle cx="50" cy="50" r="50" fill="url(#avatar)"/>' +
    '<text x="50" y="58" font-family="Arial, Helvetica, sans-serif" font-size="36" fill="white" text-anchor="middle" font-weight="bold">U</text>' +
    '</svg>'
  )

// Default avatar - MaiPlay branded
export const DEFAULT_AVATAR = 
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
    '<defs>' +
    '<linearGradient id="def" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" style="stop-color:#ef4444"/>' +
    '<stop offset="100%" style="stop-color:#eab308"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<circle cx="50" cy="50" r="50" fill="url(#def)"/>' +
    '<text x="50" y="60" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="black" text-anchor="middle" font-weight="bold">MAI</text>' +
    '</svg>'
  )
