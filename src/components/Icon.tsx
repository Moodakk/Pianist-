interface Props {
  name: IconName
  size?: number
  className?: string
  stroke?: number
}

export type IconName =
  | 'home'
  | 'library'
  | 'upload'
  | 'play'
  | 'pause'
  | 'stop'
  | 'progress'
  | 'settings'
  | 'search'
  | 'star'
  | 'star-fill'
  | 'midi'
  | 'metronome'
  | 'speed'
  | 'hand'
  | 'mic'
  | 'sparkles'
  | 'chevron-right'
  | 'piano'
  | 'check'
  | 'close'

const paths: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  library: 'M4 5h4v14H4zM10 5h4v14h-4zM17 5l3 14-3 .8z',
  upload: 'M12 3v12m0-12-4 4m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  play: 'M7 5v14l12-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  stop: 'M6 6h12v12H6z',
  progress: 'M4 19h16M6 17l4-6 4 3 4-7',
  settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM19.4 13l1.6 1-2 3.4-1.9-.6a7.5 7.5 0 0 1-2 1.1l-.3 2H10.2l-.3-2a7.5 7.5 0 0 1-2-1.1l-1.9.6-2-3.4 1.6-1a7.6 7.6 0 0 1 0-2L4 10l2-3.4 1.9.6a7.5 7.5 0 0 1 2-1.1l.3-2h3.6l.3 2a7.5 7.5 0 0 1 2 1.1l1.9-.6 2 3.4-1.6 1a7.6 7.6 0 0 1 0 2z',
  search: 'M10 17a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm11 4-6-6',
  star: 'm12 3 2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.8l-5.8 3.2 1.1-6.5L2.5 9.9l6.6-.9z',
  'star-fill': 'm12 3 2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.8l-5.8 3.2 1.1-6.5L2.5 9.9l6.6-.9z',
  midi: 'M5 10a7 7 0 1 1 14 0v4a3 3 0 0 1-3 3h-1v-5h3M5 14a3 3 0 0 0 3 3h1v-5H5',
  metronome: 'M9 3h6l3 18H6zM12 9l-3 6h6z',
  speed: 'M12 21a9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9 9M12 12l5-3',
  hand: 'M8 11V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5a1.5 1.5 0 0 1 3 0v9a7 7 0 0 1-7 7 7 7 0 0 1-7-7v-3a1.5 1.5 0 0 1 3 0v2',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  sparkles: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  'chevron-right': 'm9 6 6 6-6 6',
  piano: 'M3 5h18v14H3zM7 5v10M11 5v10M15 5v10M19 5v10M3 15h18',
  check: 'M5 12l5 5L20 7',
  close: 'M6 6l12 12M6 18 18 6',
}

export function Icon({ name, size = 20, className = '', stroke = 1.8 }: Props) {
  const fill = name === 'star-fill' || name === 'play' || name === 'pause' || name === 'stop' || name === 'home' || name === 'sparkles'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={fill ? 0 : stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
