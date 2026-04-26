export default function Avatar({ name, seed = '', size = 120 }) {
  // Hàm hash đơn giản để tạo màu nhất quán từ seed
  const hashCode = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#F38181', '#AA96DA', '#FCBAD3']
  const backgroundColor = colors[Math.abs(hashCode(seed || name)) % colors.length]

  // Lấy initials từ tên
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: backgroundColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: size * 0.35,
      fontWeight: 'bold',
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      {initials}
    </div>
  )
}
