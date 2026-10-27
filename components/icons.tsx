const P = (d: string) => function Icon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
};
export const ISearch = P("M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4");
export const IList = P("M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01");
export const IUsers = P("M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M15.5 3.1a3.5 3.5 0 0 1 0 6.8");
export const IHome = P("M3 11 12 4l9 7M5 10v10h14V10");
export const IInbox = P("M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6z");
export const IShield = P("M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z M9 12l2 2 4-4");
export const IBook = P("M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM18 20H7a3 3 0 0 1 0-6h11");
export const IMegaphone = P("M3 10v4h3l7 5V5L6 10zM17 8a5 5 0 0 1 0 8");
export const IReceipt = P("M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6");
export const ISettings = P("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z");
export const ILogout = P("M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10");
export const ICheck = P("M5 12l5 5L20 7");
export const IPhone = P("M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2");
export const IWhatsapp = P("M3 21l1.7-5A9 9 0 1 1 8 19.3zM9 9c0 3 3 6 6 6l1.5-1.5-2-1-1 1c-1 0-2.5-1.5-2.5-2.5l1-1-1-2z");
export const IUpload = P("M12 16V4M7 9l5-5 5 5M4 16v4h16v-4");
export const IClock = P("M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z");
export const IPin = P("M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z");
export const ITruck = P("M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z");
export const IBed = P("M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z");
export const IDoc = P("M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6");
export const IPlus = P("M12 5v14M5 12h14");
export const IX = P("M6 6l12 12M18 6 6 18");
export const ICalendar = P("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4");
export const IChart = P("M4 20V10M10 20V4M16 20v-7M22 20H2");
