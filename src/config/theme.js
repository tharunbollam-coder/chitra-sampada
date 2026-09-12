/**
 * Single source of truth for site-wide brand colors, accent tokens, and class presets.
 * To change the site's accent color in the future, edit the values below in one place.
 */

export const theme = {
  colors: {
    primary: '#0F172A',      // Midnight Slate (Primary elements & headings)
    background: '#F8FAFC',   // Warm Off-White (Canvas)
    surface: '#FFFFFF',      // Card & panel surface
    bodyText: '#334155',     // Crisp Dark Slate (Body copy)
    mutedText: '#64748B',    // Slate 500 (Subtle & metadata text)
    border: '#E2E8F0',       // Light border slate
    borderHover: '#CBD5E1',  // Elevated border slate
  },
  accent: {
    // Primary vibrant solid accent
    base: '#6366F1',         // Vibrant Electric Indigo
    hover: '#4F46E5',        // Indigo 600 for interactive hover
    active: '#4338CA',       // Indigo 700 for active / pressed states
    
    // Light surface tint for pills, badges, and soft highlights
    tint: '#EEF2FF',         // Indigo 50 soft surface
    tintHover: '#E0E7FF',    // Indigo 100 on hover
    border: '#C7D2FE',       // Indigo 200 pill & badge border

    // High contrast text on solid accent
    contrastText: '#FFFFFF',

    // High-contrast text on light backgrounds (AAA / AA compliant)
    textLightBg: '#4F46E5',

    // Reusable class bundles for complete consistency across Astro components
    classes: {
      // Primary solid action buttons
      btnPrimary: 'bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-sm shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200',
      
      // Secondary action buttons
      btnSecondary: 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm border border-slate-200 shadow-xs hover:-translate-y-0.5 transition-all duration-200',

      // Badges and pills
      badge: 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-bold shadow-2xs',

      // Text styling
      text: 'text-[#6366F1]',
      textLink: 'text-[#4F46E5] hover:text-[#4338CA]',
      textHover: 'hover:text-[#4F46E5]',
      
      // Interactive focus & selection
      focusRing: 'focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/25',

      // Dots & status indicators
      dot: 'bg-[#6366F1]',
      glowDot: 'bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,0.6)]',

      // Tabs
      activeTab: 'bg-[#6366F1] text-white shadow-sm shadow-indigo-500/25',
      activeCounter: 'bg-[#4338CA] text-white',

      // Border accents
      borderAccent: 'border-[#6366F1]',
    }
  }
};
