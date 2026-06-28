import { useEffect, useRef } from 'react'

export default function PokeSnoopLogo({
  className = '',
  size = 320,
  pokeColor = '#101624',
}: {
  className?: string
  size?: number
  pokeColor?: string
}) {
  const leftEye = useRef(null)
  const rightEye = useRef(null)

  useEffect(() => {
    function setPupilOffset(eye, x, y) {
      if (!eye) return
      eye.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
    }

    function resetEyes() {
      setPupilOffset(leftEye.current, 0, 0)
      setPupilOffset(rightEye.current, 0, 0)
    }

    function onMove(e) {
      const eyes = [leftEye.current, rightEye.current]
      eyes.forEach((eye) => {
        if (!eye) return

        const socket = eye.parentElement
        if (!socket) return

        const rect = socket.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2

        let x, y
        if (e.touches && e.touches[0]) {
          x = e.touches[0].clientX
          y = e.touches[0].clientY
        } else {
          x = e.clientX
          y = e.clientY
        }

        const dx = x - cx
        const dy = y - cy

        // Very subtle motion: max 12% of socket radius.
        const socketRadius = rect.width / 2
        const maxMove = socketRadius * 0.12
        const dist = Math.min(maxMove, Math.sqrt(dx * dx + dy * dy))
        const angle = Math.atan2(dy, dx)

        const moveX = Math.cos(angle) * dist
        const moveY = Math.sin(angle) * dist
        setPupilOffset(eye, moveX, moveY)
      })
    }

    function onMouseOut(event) {
      if (!event.relatedTarget) resetEyes()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove)
    window.addEventListener('mouseout', onMouseOut)
    window.addEventListener('pointercancel', resetEyes)
    window.addEventListener('blur', resetEyes)

    resetEyes()

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseout', onMouseOut)
      window.removeEventListener('pointercancel', resetEyes)
      window.removeEventListener('blur', resetEyes)
    }
  }, [size])

  const letterStyle = {
    fontFamily: 'inherit',
    fontWeight: 900,
    letterSpacing: '-0.04em',
    lineHeight: 1,
    display: 'inline-block',
  }

  const earBaseStyle = {
    position: 'absolute' as const,
    top: size / -10,
    width: size / 14,
    height: size / 6,
    transformOrigin: '50% 100%',
    pointerEvents: 'none' as const,
    zIndex: 3,
  }

  return (
    <div className={`flex items-start font-black select-none ${className}`} style={{ fontSize: size / 4 }}>
      <span style={{ ...letterStyle, color: pokeColor }}>Poke</span>
      <span style={{ ...letterStyle, color: '#FFC72C', marginLeft: size * 0.01 }}>S</span>
      <span style={{ ...letterStyle, color: '#FFC72C', marginLeft: size * 0.01 }}>n</span>

      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-start', marginLeft: size * 0.015, marginRight: size * 0.015 }}>
        <span
          aria-hidden="true"
          style={{
            ...earBaseStyle,
            left: size * -0.005,
            animation: 'leftEarSway 3.4s ease-in-out infinite',
          }}
        >
          <span style={{ position: 'absolute', inset: 0, background: '#FFC72C', clipPath: 'polygon(50% 0, 0 100%, 100% 100%)', borderRadius: '999px 999px 12px 12px' }} />
          <span style={{ position: 'absolute', left: '22%', top: '16%', width: '56%', height: '58%', background: '#101624', clipPath: 'polygon(50% 0, 0 100%, 100% 100%)', borderRadius: '999px 999px 12px 12px' }} />
        </span>
        <span
          aria-hidden="true"
          style={{
            ...earBaseStyle,
            right: size * -0.005,
            animation: 'rightEarSway 3.8s ease-in-out infinite',
          }}
        >
          <span style={{ position: 'absolute', inset: 0, background: '#FFC72C', clipPath: 'polygon(50% 0, 0 100%, 100% 100%)', borderRadius: '999px 999px 12px 12px' }} />
          <span style={{ position: 'absolute', left: '22%', top: '16%', width: '56%', height: '58%', background: '#101624', clipPath: 'polygon(50% 0, 0 100%, 100% 100%)', borderRadius: '999px 999px 12px 12px' }} />
        </span>

        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {/* Premier o avec œil */}
          <span style={{ ...letterStyle, color: '#FFC72C', position: 'relative', width: size / 5, textAlign: 'center', display: 'inline-block' }}>
            <span style={{ color: '#FFC72C', fontSize: '1em', fontWeight: 900 }}>o</span>
            <span ref={leftEye} style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
              width: size / 13,
              height: size / 13,
              background: '#101624',
              borderRadius: '50%',
              display: 'inline-block',
              transition: 'transform 0.12s ease-out',
              zIndex: 2,
            }}>
              <span style={{ position: 'absolute', left: '30%', top: '30%', width: size / 40, height: size / 40, background: '#fff', borderRadius: '50%', display: 'block' }} />
            </span>
          </span>
          {/* Deuxième o avec œil */}
          <span style={{ ...letterStyle, color: '#FFC72C', position: 'relative', width: size / 5, textAlign: 'center', display: 'inline-block' }}>
            <span style={{ color: '#FFC72C', fontSize: '1em', fontWeight: 900 }}>o</span>
            <span ref={rightEye} style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
              width: size / 13,
              height: size / 13,
              background: '#101624',
              borderRadius: '50%',
              display: 'inline-block',
              transition: 'transform 0.12s ease-out',
              zIndex: 2,
            }}>
              <span style={{ position: 'absolute', left: '30%', top: '30%', width: size / 40, height: size / 40, background: '#fff', borderRadius: '50%', display: 'block' }} />
            </span>
          </span>
        </span>
      </span>
      <span style={{ ...letterStyle, color: '#FFC72C', marginLeft: size * 0.01 }}>p</span>

      <style jsx>{`
        @keyframes leftEarSway {
          0%, 100% { transform: translateY(0) rotate(-14deg); }
          25% { transform: translateY(-2px) rotate(-10deg); }
          50% { transform: translateY(1px) rotate(-16deg); }
          75% { transform: translateY(-1px) rotate(-12deg); }
        }

        @keyframes rightEarSway {
          0%, 100% { transform: translateY(0) rotate(14deg); }
          25% { transform: translateY(-1px) rotate(10deg); }
          50% { transform: translateY(2px) rotate(16deg); }
          75% { transform: translateY(-2px) rotate(12deg); }
        }
      `}</style>
    </div>
  )
}
