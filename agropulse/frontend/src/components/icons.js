const P = {
  home: "M3 11.5 12 4l9 7.5M5.5 10.5V20h13v-9.5",
  map: "M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Zm0 0v14m6-12v14",
  bell: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4 10a2 2 0 0 0 4 0",
  market: "M4 7h16l-1.5 12h-13L4 7Zm4 0a4 4 0 0 1 8 0",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  leaf: "M5 19C5 9 13 5 20 5c0 8-4 14-13 14m0 0c-1-5 2-9 6-11",
  check: "m5 12 5 5 9-10",
  cross: "M6 6l12 12M18 6 6 18",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  camera: "M4 8h3l2-2h6l2 2h3v11H4V8Zm8 7a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
};
export default function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] || P.bolt} />
    </svg>
  );
}
